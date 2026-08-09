import { describe, it, expect } from 'vitest';
import {
  appendSample,
  availability,
  currentOutageLength,
  incidents,
  loadHistory,
  looksLikeLocalNetwork,
  MAX_AGE_MS,
  MAX_SAMPLES,
  percentile,
  prune,
  saveHistory,
  STORAGE_KEY,
} from '../statusHistory';
import type { RecordedState, Sample } from '../statusHistory';

const NOW = 1_800_000_000_000;

function sample(state: RecordedState, latencyMs: number | null = 100, offsetMs = 0): Sample {
  return { at: NOW + offsetMs, state, latencyMs };
}

/** An in-memory Storage, so these never touch jsdom's shared localStorage. */
function fakeStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  } as Storage;
}

describe('prune', () => {
  it('keeps the newest samples when the window is full', () => {
    const samples = Array.from({ length: MAX_SAMPLES + 20 }, (_, i) =>
      sample('operational', i, i * 1000)
    );
    const kept = prune(samples, NOW + MAX_SAMPLES * 1000 + 20_000);

    expect(kept).toHaveLength(MAX_SAMPLES);
    // The newest survive - a status page that dropped the last hour to keep
    // this morning would be showing the wrong end of its own history.
    expect(kept[kept.length - 1]?.latencyMs).toBe(MAX_SAMPLES + 19);
  });

  // The age bound and the count bound catch different things, so both have to
  // apply. A tab reopened next week must not draw last week's outage as if it
  // were this minute, however few samples that leaves.
  it('drops samples that have aged out even when there is room for them', () => {
    const stale = sample('down', 50, -MAX_AGE_MS - 1);
    const fresh = sample('operational', 50, -1000);

    expect(prune([stale, fresh], NOW)).toEqual([fresh]);
  });
});

describe('appendSample', () => {
  it('adds to the named service without touching the others', () => {
    const history = { gateway: [sample('operational')], docs: [sample('operational')] };
    const next = appendSample(history, 'gateway', sample('down', 8000, 60_000), NOW + 60_000);

    expect(next.gateway).toHaveLength(2);
    expect(next.docs).toHaveLength(1);
    expect(history.gateway).toHaveLength(1); // original untouched
  });

  it('starts a service that has no history yet', () => {
    expect(appendSample({}, 'docs', sample('operational')).docs).toHaveLength(1);
  });
});

describe('availability', () => {
  it('is null with nothing recorded, rather than a confident 100%', () => {
    expect(availability([])).toBeNull();
  });

  // Slow is not broken. A page reporting 40% "uptime" because a phone was on a
  // bad connection would be telling the visitor something untrue about the
  // service - the slowness is visible in the latency chart, where it belongs.
  it('counts a slow check as answered', () => {
    expect(availability([sample('operational'), sample('degraded')])).toBe(100);
  });

  it('counts only failures against it', () => {
    const samples = [sample('operational'), sample('down'), sample('operational'), sample('down')];
    expect(availability(samples)).toBe(50);
  });
});

describe('percentile', () => {
  it('is null when nothing reported a latency', () => {
    expect(percentile([sample('down', null)], 50)).toBeNull();
  });

  // A check that never reported a latency is missing data, not a fast one -
  // counting it as zero would drag every median toward a speed nothing achieved.
  it('drops nulls rather than treating them as zero', () => {
    const samples = [sample('operational', 100), sample('down', null), sample('operational', 300)];
    expect(percentile(samples, 50)).toBe(100);
  });

  it('reads the tail, not the average', () => {
    const samples = [10, 20, 30, 40, 5000].map((ms) => sample('operational', ms));
    expect(percentile(samples, 50)).toBe(30);
    expect(percentile(samples, 95)).toBe(5000);
  });
});

describe('currentOutageLength', () => {
  it('is zero while the newest check passed', () => {
    expect(currentOutageLength([sample('down'), sample('operational')])).toBe(0);
  });

  it('counts back through consecutive failures only', () => {
    const samples = [sample('down'), sample('operational'), sample('down'), sample('down')];
    expect(currentOutageLength(samples)).toBe(2);
  });
});

describe('incidents', () => {
  // Twelve separate one-minute failures is a service flapping; one
  // twelve-minute run is an outage. They read identically as a count, which is
  // the reason this groups them.
  it('groups consecutive failures into one run', () => {
    const samples = [
      sample('operational', 100, 0),
      sample('down', 8000, 60_000),
      sample('down', 8000, 120_000),
      sample('operational', 100, 180_000),
    ];

    const runs = incidents(samples);
    expect(runs).toHaveLength(1);
    expect(runs[0].samples).toBe(2);
    expect(runs[0].startedAt).toBe(NOW + 60_000);
    expect(runs[0].endedAt).toBe(NOW + 120_000);
    expect(runs[0].ongoing).toBe(false);
  });

  it('separates runs that recovered in between', () => {
    const samples = [
      sample('down', 8000, 0),
      sample('operational', 100, 60_000),
      sample('down', 8000, 120_000),
    ];
    expect(incidents(samples)).toHaveLength(2);
  });

  it('marks a run still in progress at the end of the window', () => {
    const runs = incidents([sample('operational', 100, 0), sample('down', 8000, 60_000)]);
    expect(runs[runs.length - 1]?.ongoing).toBe(true);
  });

  it('finds nothing in a clean window', () => {
    expect(incidents([sample('operational'), sample('degraded')])).toEqual([]);
  });
});

describe('looksLikeLocalNetwork', () => {
  // The banner this drives tells someone to go check their router. Getting it
  // wrong during a real outage talks them out of reporting it, so it has to be
  // hard to trigger.
  it('needs every service to be unhappy, not most of them', () => {
    expect(looksLikeLocalNetwork(['down', 'down', 'operational'])).toBe(false);
    expect(looksLikeLocalNetwork(['down', 'down', 'degraded'])).toBe(true);
  });

  it('will not fire on a single service, which proves nothing', () => {
    expect(looksLikeLocalNetwork(['down'])).toBe(false);
    expect(looksLikeLocalNetwork([])).toBe(false);
  });
});

describe('persistence', () => {
  it('round-trips a history', () => {
    const storage = fakeStorage();
    const history = { gateway: [sample('operational', 120)] };

    saveHistory(history, storage);
    expect(loadHistory(storage)).toEqual(history);
  });

  it('returns an empty history when nothing is stored', () => {
    expect(loadHistory(fakeStorage())).toEqual({});
  });

  // localStorage is shared with every other script on the origin and survives
  // deploys, so this will eventually meet something it did not write. A status
  // page that throws on load because of a stale key is a worse failure than
  // the outage it exists to report.
  it.each([
    ['unparseable', '{not json'],
    ['an array', '[]'],
    ['a scalar', '"nope"'],
    ['null', 'null'],
  ])('survives %s in storage', (_label, raw) => {
    expect(loadHistory(fakeStorage({ [STORAGE_KEY]: raw }))).toEqual({});
  });

  // Otherwise the key is read and written back on every round as an empty
  // array, so it never ages out either - and a probe renamed six months ago
  // still has a key in every visitor's browser.
  it('drops a service whose samples have all aged out, rather than keeping it empty', () => {
    // Real clock, not the fixed NOW the rest of this file uses: loadHistory
    // prunes against Date.now(), and NOW sits in the future relative to it, so
    // fixed-time samples would never age out here.
    const realNow = Date.now();
    const storage = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({
        retired: [{ at: realNow - MAX_AGE_MS - 60_000, state: 'operational', latencyMs: 100 }],
        gateway: [{ at: realNow - 60_000, state: 'operational', latencyMs: 100 }],
      }),
    });

    const loaded = loadHistory(storage);
    expect(loaded.retired).toBeUndefined();
    expect(loaded.gateway).toHaveLength(1);
  });

  it('discards entries that are not samples, keeping the ones that are', () => {
    const storage = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({
        gateway: [sample('operational', 100), { at: 'soon', state: 'operational' }, null],
        broken: 'not an array',
        empty: [{ nope: true }],
      }),
    });

    const loaded = loadHistory(storage);
    expect(loaded.gateway).toHaveLength(1);
    expect(loaded.broken).toBeUndefined();
    // An entry whose samples were all invalid is dropped rather than kept empty.
    expect(loaded.empty).toBeUndefined();
  });

  // Not `loadHistory(undefined)` - that is the default parameter, which
  // resolves to the real storage and tests nothing. The absence has to be real,
  // so the global goes away for the duration.
  it('does not throw when the environment has no storage at all', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true });

    try {
      expect(() => saveHistory({ gateway: [sample('operational')] })).not.toThrow();
      expect(loadHistory()).toEqual({});
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });

  // Safari's private mode throws on every write, and quota is real on a shared
  // origin. Losing the history is not worth breaking the page over.
  it('swallows a storage that throws on write', () => {
    const hostile = {
      ...fakeStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as Storage;

    expect(() => saveHistory({ gateway: [sample('operational')] }, hostile)).not.toThrow();
  });
});
