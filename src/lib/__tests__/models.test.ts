import { describe, it, expect } from 'vitest';
import {
  hasCost,
  blendedCostPerMillion,
  sortModelsByAffordability,
  formatCostPerMillion,
  formatTokenLimit,
} from '../models';
import type { Model } from '../models';

const claude: Model = {
  litellmModelName: 'claude-sonnet-5',
  provider: 'anthropic',
  name: 'Claude 3.5 Sonnet',
  limit: { context: 200000, output: 8192 },
  cost: { input: 3, output: 15 },
};

const kimi: Model = {
  litellmModelName: 'kimi-k2.5',
  provider: 'moonshot',
  name: 'Kimi K2.5',
  limit: { context: 128000, output: 4096 },
  cost: { input: 0.6, output: 2.5 },
};

const noPricing: Model = {
  litellmModelName: 'mystery-model',
  provider: 'unknown',
  name: 'Mystery Model',
  limit: { context: 32000, output: 2048 },
};

describe('hasCost', () => {
  it('is true when both input and output cost are numbers', () => {
    expect(hasCost(claude)).toBe(true);
  });

  it('is false when cost is missing', () => {
    expect(hasCost(noPricing)).toBe(false);
  });

  it('is false for null/undefined', () => {
    expect(hasCost(null as unknown as Model)).toBe(false);
    expect(hasCost(undefined as unknown as Model)).toBe(false);
  });
});

describe('blendedCostPerMillion', () => {
  // models.dev already quotes per million, so this is a plain average - no
  // rescaling. Blending $3 in and $15 out gives $9.
  it('averages the input and output rate', () => {
    expect(blendedCostPerMillion(claude)).toBeCloseTo(9, 6);
  });

  it('returns null for a model without pricing', () => {
    expect(blendedCostPerMillion(noPricing)).toBeNull();
  });
});

describe('sortModelsByAffordability', () => {
  it('sorts cheapest-first and excludes unpriced models', () => {
    const ranked = sortModelsByAffordability([claude, kimi, noPricing]);
    expect(ranked.map((r) => r.model.litellmModelName)).toEqual([
      'kimi-k2.5',
      'claude-sonnet-5',
    ]);
  });

  it('returns an empty array when given no priced models', () => {
    expect(sortModelsByAffordability([noPricing])).toEqual([]);
  });

  it('defaults to an empty array when called with no argument', () => {
    expect(sortModelsByAffordability()).toEqual([]);
  });
});

describe('formatCostPerMillion', () => {
  it('formats a numeric value', () => {
    expect(formatCostPerMillion(3)).toBe('$3.00 / 1M tokens');
  });

  it('handles missing pricing gracefully', () => {
    expect(formatCostPerMillion(undefined as unknown as number)).toBe('Pricing unavailable');
  });
});

describe('formatTokenLimit', () => {
  it('formats large context windows in millions', () => {
    expect(formatTokenLimit(1_500_000)).toBe('1.5M');
  });

  it('formats mid-size limits in thousands', () => {
    expect(formatTokenLimit(200000)).toBe('200K');
    expect(formatTokenLimit(8192)).toBe('8K');
  });

  it('formats small limits as-is', () => {
    expect(formatTokenLimit(500)).toBe('500');
  });

  it('falls back for non-numeric input', () => {
    expect(formatTokenLimit(undefined as unknown as number)).toBe('—');
  });
});
