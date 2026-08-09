import { describe, it, expect } from 'vitest';
import {
  modelFamily,
  reachPercentages,
  selectLatestPerFamily,
  formatReleaseMonth,
  selectTopModels,
  tokensForUsd,
  formatTokenCount,
  formatLocalOrUsd,
  buildModelQuotes,
} from '../pricing';
import type { Model } from '../models';
import type { FxRates } from '../currency';

const fxRates: FxRates = {
  currencies: {
    NGN: { ratePerUsd: 1550.25 },
    KES: { ratePerUsd: 129.5 },
    GHS: { ratePerUsd: 15.4 },
    UGX: { ratePerUsd: 3720.0 },
  },
  supported: ['NGN', 'UGX', 'GHS', 'KES'],
  fetchedAt: 1784995200000,
};

// Costs are USD per million tokens, matching what account-service passes
// through from models.dev - these are the real published rates.
function model(litellmModelName: string, name: string, provider: string, input: number, output: number): Model {
  return { litellmModelName, name, provider, cost: { input, output } };
}

const CATALOG: Model[] = [
  model('gpt-4o', 'GPT-4o', 'OpenAI', 2.5, 10),
  model('gpt-4o-mini', 'GPT-4o mini', 'OpenAI', 0.15, 0.6),
  model('claude-sonnet', 'Claude Sonnet', 'Anthropic', 3, 15),
  model('gemini-pro', 'Gemini Pro', 'Google', 1.25, 5),
  model('some-unknown', 'Mystery 1', 'Other', 1, 2),
  { litellmModelName: 'no-price', name: 'Unpriced', provider: 'Other' },
];

describe('modelFamily', () => {
  it('recognises a flagship family from the model id or name', () => {
    expect(modelFamily(CATALOG[0])).toBe('gpt');
    expect(modelFamily(CATALOG[2])).toBe('claude');
  });

  it('returns null for a model outside the known families', () => {
    expect(modelFamily(CATALOG[4])).toBeNull();
  });
});

describe('selectTopModels', () => {
  it('picks one model per family, cheapest wins inside a family', () => {
    const top = selectTopModels(CATALOG, 3);
    expect(top.map((m) => m.litellmModelName)).toEqual(['gpt-4o-mini', 'claude-sonnet', 'gemini-pro']);
  });

  it('never returns a model without pricing', () => {
    expect(selectTopModels(CATALOG, 10).some((m) => m.litellmModelName === 'no-price')).toBe(false);
  });

  it('fills the list with the cheapest leftovers when families run out', () => {
    const top = selectTopModels(CATALOG, 10);
    expect(top).toHaveLength(5);
    expect(top.map((m) => m.litellmModelName)).toContain('some-unknown');
  });

  it('handles an empty catalog', () => {
    expect(selectTopModels([], 5)).toEqual([]);
    expect(selectTopModels(undefined, 5)).toEqual([]);
  });
});

describe('tokensForUsd', () => {
  it('divides the budget by the blended per-million rate', () => {
    // GPT-4o blends to $6.25 / 1M, so $0.50 buys 80,000 tokens.
    expect(tokensForUsd(0.5, CATALOG[0])).toBeCloseTo(80_000, 0);
  });

  it('returns null for an unpriced model', () => {
    expect(tokensForUsd(0.5, CATALOG[5])).toBeNull();
  });
});

describe('formatTokenCount', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatTokenCount(80_000)).toBe('80K');
    expect(formatTokenCount(1_333_333)).toBe('1.3M');
    expect(formatTokenCount(24_000_000)).toBe('24M');
    expect(formatTokenCount(420)).toBe('420');
  });

  it('renders a dash when there is nothing to show', () => {
    expect(formatTokenCount(null)).toBe('—');
  });
});

describe('formatLocalOrUsd', () => {
  it('converts when the FX service quotes that currency', () => {
    const result = formatLocalOrUsd(0.5, fxRates, 'NGN');
    expect(result.isLocal).toBe(true);
    expect(result.text).toContain('775');
  });

  it('falls back to USD rather than guessing a rate', () => {
    const result = formatLocalOrUsd(0.5, fxRates, 'ZAR');
    expect(result).toEqual({ text: '$0.50', isLocal: false });
  });

  it('falls back to USD when rates have not loaded yet', () => {
    expect(formatLocalOrUsd(0.5, null, 'NGN').isLocal).toBe(false);
  });
});

describe('buildModelQuotes', () => {
  it('quotes what the reference amount buys, priced in the local currency', () => {
    const quotes = buildModelQuotes(CATALOG, 0.5, fxRates, 'NGN', 2);
    expect(quotes).toHaveLength(2);
    expect(quotes[0].tokensLabel).toMatch(/M|K/);
    expect(quotes[0].perMillion.isLocal).toBe(true);
    expect(quotes[0].perMillion.text).toMatch(/[₦N]/);
  });

  it('quotes in USD for a market with no live rate', () => {
    const quotes = buildModelQuotes(CATALOG, 0.5, fxRates, 'ZAR', 2);
    expect(quotes.every((q) => !q.perMillion.isLocal)).toBe(true);
    expect(quotes[0].perMillion.text.startsWith('$')).toBe(true);
  });
});

describe('selectLatestPerFamily', () => {
  const dated: Model[] = [
    { litellmModelName: 'gpt-old', name: 'GPT old', provider: 'openai', cost: { input: 0.1, output: 0.2 }, release_date: '2024-05-13' },
    { litellmModelName: 'gpt-new', name: 'GPT new', provider: 'openai', cost: { input: 5, output: 30 }, release_date: '2026-07-09' },
    { litellmModelName: 'gpt-new-cheap', name: 'GPT new cheap', provider: 'openai', cost: { input: 0.2, output: 1.2 }, release_date: '2026-07-09' },
    { litellmModelName: 'claude-mid', name: 'Claude mid', provider: 'anthropic', cost: { input: 3, output: 15 }, release_date: '2025-09-29' },
    { litellmModelName: 'kimi-partial', name: 'Kimi partial', provider: 'moonshot', cost: { input: 1, output: 2 }, release_date: '2026-01' },
    { litellmModelName: 'no-price', name: 'Unpriced', provider: 'other', release_date: '2026-12-01' },
  ];

  it('takes the newest release in each family, not the cheapest', () => {
    const picked = selectLatestPerFamily(dated).map((m) => m.litellmModelName);
    expect(picked).not.toContain('gpt-old');
    expect(picked).toContain('claude-mid');
  });

  it('breaks a same-day tie towards the cheaper model', () => {
    const picked = selectLatestPerFamily(dated).map((m) => m.litellmModelName);
    expect(picked).toContain('gpt-new-cheap');
    expect(picked).not.toContain('gpt-new');
  });

  it('returns newest first and one entry per family', () => {
    const picked = selectLatestPerFamily(dated);
    expect(picked.map((m) => m.release_date)).toEqual(['2026-07-09', '2026-01', '2025-09-29']);
  });

  it('never features a model without a price, however new it is', () => {
    expect(selectLatestPerFamily(dated).some((m) => m.litellmModelName === 'no-price')).toBe(false);
  });

  it('handles an empty catalog', () => {
    expect(selectLatestPerFamily([])).toEqual([]);
    expect(selectLatestPerFamily(undefined)).toEqual([]);
  });
});

describe('formatReleaseMonth', () => {
  it('reads a full date', () => {
    expect(formatReleaseMonth('2026-07-09')).toBe('Jul 2026');
  });

  it('reads a month-only date, which some providers publish', () => {
    expect(formatReleaseMonth('2026-01')).toBe('Jan 2026');
  });

  it('returns null rather than a wrong month for junk', () => {
    expect(formatReleaseMonth(undefined)).toBeNull();
    expect(formatReleaseMonth('soon')).toBeNull();
    expect(formatReleaseMonth('2026-13-01')).toBeNull();
  });
});

describe('reachPercentages', () => {
  it('gives the most generous model the full rule and keeps the ranking exact', () => {
    const pct = reachPercentages([2_381_000, 714_000, 56_000]);
    expect(pct[0]).toBeCloseTo(100, 5);
    expect(pct[0]).toBeGreaterThan(pct[1]);
    expect(pct[1]).toBeGreaterThan(pct[2]);
  });

  it('keeps the priciest model visible instead of collapsing it to a sliver', () => {
    // Linearly, 56K against 2.38M is 2.3% - indistinguishable from the next
    // four rows. This is the reason the scale isn't linear.
    const pct = reachPercentages([2_381_000, 125_000, 83_000, 56_000]);
    expect(Math.min(...pct)).toBeGreaterThanOrEqual(12);
    // Rows that differ by ~50% in reach should be visibly apart.
    expect(pct[1] - pct[3]).toBeGreaterThan(5);
  });

  it('draws every rule full when each model buys the same', () => {
    expect(reachPercentages([1000, 1000])).toEqual([100, 100]);
  });

  it('draws nothing for a model with no usable token figure', () => {
    const pct = reachPercentages([1000, null, 0]);
    expect(pct[1]).toBe(0);
    expect(pct[2]).toBe(0);
  });

  it('handles an empty set', () => {
    expect(reachPercentages([])).toEqual([]);
  });
});
