// -----------------------------------------------------------------------
// The status page's memory.
//
// Every check on this page is a real request made from the visitor's own
// browser - there is no server-side monitor behind it, and no history to fetch.
// A page with no memory can only ever say "up, right now", which cannot answer
// the question people actually arrive with: is this broken, or was that one
// request unlucky?
//
// So each poll appends a sample here, and the samples persist in localStorage.
// That keeps the charts alive across a reload and lets a tab left open all day
// accumulate something worth drawing.
//
// What this is NOT, and what the page has to keep saying out loud: an uptime
// record. It is one browser's view, from one network, over one window, sampled
// once a minute. Two visitors will legitimately see different numbers. Every
// figure derived here is therefore labelled "from this browser" at the point it
// is displayed - claiming otherwise would be inventing a measurement we never
// made.
// -----------------------------------------------------------------------

/** The three states a completed check can be in. `checking` and `unmonitored` never land here. */
export type RecordedState = 'operational' | 'degraded' | 'down';

export interface Sample {
  /** Epoch ms. */
  at: number;
  state: RecordedState;
  /** Round trip in ms. Present even on a failure - how long it took to fail is a real reading. */
  latencyMs: number | null;
}

export type History = Record<string, Sample[]>;

export const STORAGE_KEY = 'rovie:status-history:v2';

/**
 * Two hours at one sample a minute. Enough to show this morning's blip, short
 * enough that the strip stays readable and localStorage stays small - the
 * quota is a few megabytes and it is shared with everything else on the origin.
 */
export const MAX_SAMPLES = 120;

/** Older than this and it is not "now" any more, whatever the sample count says. */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Slower than this is up, but not well. */
export const DEGRADED_ABOVE_MS = 2500;

/**
 * Drops samples that have aged out, then keeps the newest MAX_SAMPLES.
 *
 * Both bounds are needed and they catch different things: the age bound stops a
 * tab reopened next week from drawing last week's outage as if it were this
 * minute, and the count bound stops a long session growing without limit.
 */
export function prune(samples: Sample[], now: number = Date.now()): Sample[] {
  const cutoff = now - MAX_AGE_MS;
  return samples.filter((sample) => sample.at >= cutoff).slice(-MAX_SAMPLES);
}

export function appendSample(history: History, id: string, sample: Sample, now?: number): History {
  return { ...history, [id]: prune([...(history[id] ?? []), sample], now) };
}

/**
 * Reads the stored history, discarding anything that isn't the shape we wrote.
 *
 * Deliberately forgiving: localStorage is shared with every other script on the
 * origin and survives deploys, so this will eventually meet a value written by
 * an older version of this file or by something else entirely. A status page
 * that throws on load because of a stale key would be a worse failure than the
 * outage it exists to report.
 */
export function loadHistory(storage: Storage | undefined = safeStorage()): History {
  if (!storage) return {};

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const history: History = {};
    for (const [id, samples] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(samples)) continue;

      // Prune BEFORE testing for emptiness, not after. The other order leaves
      // a service whose samples have all aged out sitting in storage as an
      // empty array forever - and since it is read and written back on every
      // round, it never ages out either. That is how a probe we renamed six
      // months ago would still have a key in every visitor's browser.
      const kept = prune(samples.filter(isSample));
      if (kept.length > 0) history[id] = kept;
    }
    return history;
  } catch {
    return {};
  }
}

export function saveHistory(history: History, storage: Storage | undefined = safeStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Quota, or Safari's private mode, which throws on every write. Losing the
    // history is not worth breaking the page over - the live checks still work
    // and the charts simply start again from this session.
  }
}

function isSample(value: unknown): value is Sample {
  if (!value || typeof value !== 'object') return false;
  const sample = value as Partial<Sample>;
  return (
    typeof sample.at === 'number' &&
    Number.isFinite(sample.at) &&
    (sample.state === 'operational' || sample.state === 'degraded' || sample.state === 'down') &&
    (sample.latencyMs === null || typeof sample.latencyMs === 'number')
  );
}

/**
 * localStorage access can throw before it can be read from - a sandboxed iframe
 * or a browser with site data blocked throws on the property itself, not on the
 * call. Tests pass their own storage in rather than relying on jsdom's.
 */
function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------- derivations

/**
 * Share of checks that got a usable answer, 0-100.
 *
 * `degraded` counts as available on purpose: slow is not the same as broken,
 * and a page that reported 40% "uptime" because a phone was on a bad connection
 * would be telling the visitor something untrue about the service. The slow
 * checks are still visible as their own colour in the timeline and as a spike
 * in the latency chart, which is where "slow" belongs.
 */
export function availability(samples: Sample[]): number | null {
  if (samples.length === 0) return null;
  const up = samples.filter((sample) => sample.state !== 'down').length;
  return (up / samples.length) * 100;
}

/**
 * Nearest-rank percentile. Nulls are dropped rather than counted as zero -
 * a check that never reported a latency is missing data, not a fast one.
 */
export function percentile(samples: Sample[], p: number): number | null {
  const values = samples
    .map((sample) => sample.latencyMs)
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);

  if (values.length === 0) return null;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil((p / 100) * values.length) - 1));
  return values[index];
}

/** Consecutive `down` samples at the end of the window. 0 while a service is up. */
export function currentOutageLength(samples: Sample[]): number {
  let count = 0;
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    if (samples[i].state !== 'down') break;
    count += 1;
  }
  return count;
}

export interface Incident {
  startedAt: number;
  /** Last sample of the run. Equal to startedAt for a single-sample blip. */
  endedAt: number;
  samples: number;
  /** True while the run is still the newest thing in the window. */
  ongoing: boolean;
}

/**
 * Runs of consecutive `down` samples, oldest first.
 *
 * A run rather than a count, because those are different stories: twelve
 * separate one-minute failures is a flapping service, and one twelve-minute
 * failure is an outage. Both show as "12 down" without this.
 */
export function incidents(samples: Sample[]): Incident[] {
  const runs: Incident[] = [];
  let current: Incident | null = null;

  samples.forEach((sample, index) => {
    if (sample.state === 'down') {
      if (current) {
        current.endedAt = sample.at;
        current.samples += 1;
      } else {
        current = { startedAt: sample.at, endedAt: sample.at, samples: 1, ongoing: false };
      }
      if (index === samples.length - 1 && current) current.ongoing = true;
    } else if (current) {
      runs.push(current);
      current = null;
    }
  });

  if (current) runs.push(current);
  return runs;
}

/**
 * Were the slow or failing checks in this round spread across every service?
 *
 * The single most useful thing this page can tell someone, and the thing a
 * per-service list cannot say. One service struggling is a service problem.
 * Every service struggling at the same instant is almost always the one thing
 * they have in common that we do not control: the visitor's own connection.
 *
 * Needs at least two services with a reading, and requires ALL of them to be
 * unhappy - "most of them" would fire on a real two-service outage and send
 * someone to reset a router while the gateway is down.
 */
export function looksLikeLocalNetwork(states: RecordedState[]): boolean {
  if (states.length < 2) return false;
  return states.every((state) => state !== 'operational');
}
