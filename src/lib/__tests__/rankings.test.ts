import { describe, it, expect } from 'vitest';
import {
  attributedShare,
  contextFillPercent,
  foldProviderTail,
  formatCompactNumber,
  formatDuration,
  formatShortDate,
  hasEnoughData,
  toRankedRows,
} from '../rankings';
import type { ProviderUsage } from '../rankings';
import {
  CATEGORICAL,
  SEQUENTIAL_DARK,
  SEQUENTIAL_LIGHT,
  VIZ_EMPTY,
  categoricalAt,
  sequentialFor,
  sequentialStep,
} from '../viz/palette';

describe('toRankedRows', () => {
  const items = [
    { key: 'a', label: 'A', value: 60 },
    { key: 'b', label: 'B', value: 30 },
    { key: 'c', label: 'C', value: 10 },
  ];

  it('scales bars against the largest row, not the total', () => {
    // Against the total the leader would be a 60% stub; against the max it
    // fills the track and the comparison stays readable.
    const rows = toRankedRows(items);
    expect(rows[0].barPercent).toBe(100);
    expect(rows[1].barPercent).toBe(50);
  });

  it('reports share against the total', () => {
    const rows = toRankedRows(items);
    expect(rows[0].sharePercent).toBeCloseTo(60, 5);
    expect(rows[2].sharePercent).toBeCloseTo(10, 5);
  });

  it('survives an all-zero set without dividing by zero', () => {
    const rows = toRankedRows([{ key: 'a', label: 'A', value: 0 }]);
    expect(rows[0].barPercent).toBe(0);
    expect(rows[0].sharePercent).toBe(0);
  });

  it('returns nothing for an empty set', () => {
    expect(toRankedRows([])).toEqual([]);
  });
});

describe('foldProviderTail', () => {
  const provider = (name: string, tokens: number): ProviderUsage => ({
    provider: name,
    tokens,
    spendUsd: 0,
    requests: 0,
  });

  it('leaves a short list alone, sorted', () => {
    const result = foldProviderTail([provider('a', 1), provider('b', 5)]);
    expect(result.map((r) => r.provider)).toEqual(['b', 'a']);
    expect(result.every((r) => !r.isOther)).toBe(true);
  });

  it('folds everything past the colour ceiling into one Other bucket', () => {
    const many = Array.from({ length: 12 }, (_, i) => provider(`p${i}`, 100 - i));
    const result = foldProviderTail(many);

    // Eight slots total: seven named plus Other. A ninth hue would be
    // indistinguishable from an existing one under CVD.
    expect(result).toHaveLength(8);
    expect(result[7].provider).toBe('Other');
    expect(result[7].isOther).toBe(true);
    // Nothing is lost in the fold.
    expect(result.reduce((sum, r) => sum + r.tokens, 0)).toBe(
      many.reduce((sum, r) => sum + r.tokens, 0)
    );
  });

  it('does not mutate its input', () => {
    const input = [provider('a', 1), provider('b', 5)];
    foldProviderTail(input);
    expect(input[0].provider).toBe('a');
  });
});

describe('formatCompactNumber', () => {
  it('scales through K, M and B', () => {
    expect(formatCompactNumber(430)).toBe('430');
    expect(formatCompactNumber(4_300)).toBe('4.3K');
    expect(formatCompactNumber(43_000)).toBe('43K');
    expect(formatCompactNumber(4_300_000)).toBe('4.3M');
    expect(formatCompactNumber(12_400_000_000)).toBe('12B');
  });

  it('handles a non-number without printing NaN', () => {
    expect(formatCompactNumber(Number.NaN)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('switches to seconds past a thousand milliseconds', () => {
    expect(formatDuration(820)).toBe('820ms');
    expect(formatDuration(1_400)).toBe('1.4s');
  });

  it('renders an absent measurement as a dash, not zero', () => {
    expect(formatDuration(null)).toBe('—');
  });
});

describe('formatShortDate', () => {
  it('formats an ISO date for an axis tick', () => {
    expect(formatShortDate('2026-08-08')).toBe('8 Aug');
  });

  it('passes through anything it cannot parse', () => {
    expect(formatShortDate('nonsense')).toBe('nonsense');
  });
});

describe('attributedShare', () => {
  it('reports the share of traffic that named itself', () => {
    const apps = [
      { app: 'opencode', tokens: 300, requests: 0 },
      { app: 'cline', tokens: 200, requests: 0 },
    ];
    expect(attributedShare(apps, 1000)).toBeCloseTo(50, 5);
  });

  it('is null when nothing has identified itself', () => {
    expect(attributedShare([], 1000)).toBeNull();
  });

  it('never exceeds 100% if tags outrun the token total', () => {
    expect(attributedShare([{ app: 'a', tokens: 5000, requests: 0 }], 1000)).toBe(100);
  });
});

describe('contextFillPercent', () => {
  const usage = {
    model: 'claude-sonnet-5',
    medianPromptTokens: 10_000,
    p90PromptTokens: 100_000,
    maxPromptTokens: 150_000,
    requests: 500,
  };

  it('measures p90 prompt size against the advertised window', () => {
    expect(contextFillPercent(usage, 200_000)).toBeCloseTo(50, 5);
  });

  it('returns null rather than guessing when the window is unknown', () => {
    expect(contextFillPercent(usage, undefined)).toBeNull();
  });
});

describe('hasEnoughData', () => {
  it('is false for nothing and true once rows exist', () => {
    expect(hasEnoughData(null)).toBe(false);
    expect(hasEnoughData([])).toBe(false);
    expect(hasEnoughData([1])).toBe(true);
    expect(hasEnoughData([1], 2)).toBe(false);
  });
});

describe('palette', () => {
  it('assigns categorical hues by fixed position', () => {
    expect(categoricalAt(0)).toBe(CATEGORICAL[0]);
    expect(categoricalAt(7)).toBe(CATEGORICAL[7]);
  });

  it('never invents a ninth hue', () => {
    // Past the ceiling the tail should already be folded; if it isn't, the
    // colour falls back to the empty grey rather than cycling.
    expect(categoricalAt(8)).toBe(VIZ_EMPTY);
    expect(categoricalAt(99)).toBe(VIZ_EMPTY);
  });

  it('maps magnitude onto the sequential ramp, biggest furthest from the page', () => {
    expect(sequentialStep(100, 100)).toBe(SEQUENTIAL_DARK[SEQUENTIAL_DARK.length - 1]);
    expect(sequentialStep(1, 100)).toBe(SEQUENTIAL_DARK[0]);
  });

  // Both ramps are "lowest step first", so the caller never has to know which
  // end is which - only which ramp the page is on.
  it('runs the light ramp the same way round, toward dark instead of light', () => {
    const ramp = sequentialFor(false);
    expect(ramp).toBe(SEQUENTIAL_LIGHT);
    expect(sequentialStep(100, 100, ramp)).toBe(SEQUENTIAL_LIGHT[SEQUENTIAL_LIGHT.length - 1]);
    expect(sequentialStep(1, 100, ramp)).toBe(SEQUENTIAL_LIGHT[0]);
  });

  it('picks the ramp from the system preference', () => {
    expect(sequentialFor(true)).toBe(SEQUENTIAL_DARK);
    expect(sequentialFor(false)).toBe(SEQUENTIAL_LIGHT);
  });

  // Both ramps have to be the same length, or a value that lands on the last
  // step of one would fall off the end of the other.
  it('keeps the two ramps the same length', () => {
    expect(SEQUENTIAL_LIGHT).toHaveLength(SEQUENTIAL_DARK.length);
  });

  it('paints zero and negative values as "no data", not as a low value', () => {
    expect(sequentialStep(0, 100)).toBe(VIZ_EMPTY);
    expect(sequentialStep(-5, 100)).toBe(VIZ_EMPTY);
    expect(sequentialStep(10, 0)).toBe(VIZ_EMPTY);
  });

  it('keeps ranks intact under the square-root scale', () => {
    // The scale compresses a skewed distribution so mid-sized countries stay
    // visible, but a bigger value must never get a darker step.
    const values = [5, 50, 200, 1000];
    const steps = values.map((v) => SEQUENTIAL_DARK.indexOf(sequentialStep(v, 1000) as never));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });
});
