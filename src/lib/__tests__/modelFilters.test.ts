import { describe, it, expect } from 'vitest';
import {
  EMPTY_FILTERS,
  filterAndSortModels,
  filterModels,
  isFilterActive,
  maxBlendedCostOf,
  providerFacets,
  sortModels,
  toggleValue,
} from '../modelFilters';
import type { Model } from '../models';

const claude: Model = {
  litellmModelName: 'claude-sonnet-5',
  provider: 'anthropic',
  name: 'Claude Sonnet 5',
  limit: { context: 200_000, output: 8192 },
  cost: { input: 3, output: 15 },
  modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
  tool_call: true,
  reasoning: true,
  release_date: '2026-02-11',
};

const kimi: Model = {
  litellmModelName: 'kimi-k2.5',
  provider: 'moonshot',
  name: 'Kimi K2.5',
  limit: { context: 128_000, output: 4096 },
  cost: { input: 0.6, output: 2.5 },
  modalities: { input: ['text'], output: ['text'] },
  tool_call: true,
  open_weights: true,
  release_date: '2025-11-02',
};

const gpt: Model = {
  litellmModelName: 'gpt-4o',
  provider: 'openai',
  name: 'GPT-4o',
  limit: { context: 128_000, output: 16_384 },
  cost: { input: 2.5, output: 10 },
  modalities: { input: ['text', 'image', 'audio'], output: ['text'] },
  tool_call: true,
  release_date: '2024-05-13',
};

/** Served by the proxy but absent from models.dev — no pricing, no metadata. */
const unpriced: Model = {
  litellmModelName: 'brand-new-x',
  provider: 'unknown',
  name: 'brand-new-x',
};

const catalog = [claude, kimi, gpt, unpriced];
const names = (models: Model[]) => models.map((m) => m.litellmModelName);

describe('filterModels', () => {
  it('returns everything when no filter is set', () => {
    expect(filterModels(catalog, EMPTY_FILTERS)).toHaveLength(4);
  });

  it('matches search across name, id, and provider', () => {
    expect(names(filterModels(catalog, { ...EMPTY_FILTERS, search: 'kimi' }))).toEqual(['kimi-k2.5']);
    expect(names(filterModels(catalog, { ...EMPTY_FILTERS, search: 'openai' }))).toEqual(['gpt-4o']);
  });

  it('requires every search word to match, so extra words narrow', () => {
    expect(names(filterModels(catalog, { ...EMPTY_FILTERS, search: 'claude sonnet' }))).toEqual([
      'claude-sonnet-5',
    ]);
    expect(filterModels(catalog, { ...EMPTY_FILTERS, search: 'claude kimi' })).toEqual([]);
  });

  it('filters by provider', () => {
    const result = filterModels(catalog, { ...EMPTY_FILTERS, providers: ['openai', 'moonshot'] });
    expect(names(result)).toEqual(['kimi-k2.5', 'gpt-4o']);
  });

  it('requires ALL selected modalities, not any', () => {
    expect(names(filterModels(catalog, { ...EMPTY_FILTERS, modalities: ['image'] }))).toEqual([
      'claude-sonnet-5',
      'gpt-4o',
    ]);
    // Only Claude takes both.
    expect(names(filterModels(catalog, { ...EMPTY_FILTERS, modalities: ['image', 'pdf'] }))).toEqual([
      'claude-sonnet-5',
    ]);
  });

  it('treats a model with no declared modalities as text-only', () => {
    expect(names(filterModels([unpriced], { ...EMPTY_FILTERS, modalities: ['text'] }))).toEqual([
      'brand-new-x',
    ]);
    expect(filterModels([unpriced], { ...EMPTY_FILTERS, modalities: ['image'] })).toEqual([]);
  });

  it('requires ALL selected capabilities', () => {
    expect(
      names(filterModels(catalog, { ...EMPTY_FILTERS, capabilities: ['tool_call'] }))
    ).toEqual(['claude-sonnet-5', 'kimi-k2.5', 'gpt-4o']);
    expect(
      names(filterModels(catalog, { ...EMPTY_FILTERS, capabilities: ['tool_call', 'reasoning'] }))
    ).toEqual(['claude-sonnet-5']);
  });

  it('excludes unpriced models when a price ceiling is set', () => {
    // An unpriced model can't be shown to be under budget, so it drops out
    // rather than appearing as though it were free.
    const result = filterModels(catalog, { ...EMPTY_FILTERS, maxBlendedCost: 7 });
    expect(names(result)).toEqual(['kimi-k2.5', 'gpt-4o']);
  });

  it('filters by minimum context window', () => {
    expect(names(filterModels(catalog, { ...EMPTY_FILTERS, minContext: 200_000 }))).toEqual([
      'claude-sonnet-5',
    ]);
  });

  it('combines filters conjunctively', () => {
    const result = filterModels(catalog, {
      ...EMPTY_FILTERS,
      capabilities: ['tool_call'],
      maxBlendedCost: 7,
      minContext: 128_000,
    });
    expect(names(result)).toEqual(['kimi-k2.5', 'gpt-4o']);
  });
});

describe('sortModels', () => {
  it('sorts by blended cost ascending, unpriced last', () => {
    expect(names(sortModels(catalog, 'cost-asc'))).toEqual([
      'kimi-k2.5',
      'gpt-4o',
      'claude-sonnet-5',
      'brand-new-x',
    ]);
  });

  it('keeps unpriced last when sorting descending too', () => {
    expect(names(sortModels(catalog, 'cost-desc'))).toEqual([
      'claude-sonnet-5',
      'gpt-4o',
      'kimi-k2.5',
      'brand-new-x',
    ]);
  });

  it('sorts by context window, largest first, missing last', () => {
    const ordered = names(sortModels(catalog, 'context-desc'));
    expect(ordered[0]).toBe('claude-sonnet-5');
    expect(ordered[ordered.length - 1]).toBe('brand-new-x');
  });

  it('sorts newest first with undated models last', () => {
    expect(names(sortModels(catalog, 'newest'))).toEqual([
      'claude-sonnet-5',
      'kimi-k2.5',
      'gpt-4o',
      'brand-new-x',
    ]);
  });

  it('does not mutate its input', () => {
    const input = [...catalog];
    sortModels(input, 'cost-desc');
    expect(names(input)).toEqual(names(catalog));
  });
});

describe('filterAndSortModels', () => {
  it('filters first, then sorts what survives', () => {
    const result = filterAndSortModels(
      catalog,
      { ...EMPTY_FILTERS, capabilities: ['tool_call'] },
      'cost-desc'
    );
    expect(names(result)).toEqual(['claude-sonnet-5', 'gpt-4o', 'kimi-k2.5']);
  });
});

describe('providerFacets', () => {
  it('counts models per provider, busiest first', () => {
    expect(providerFacets([claude, kimi, gpt, { ...gpt, litellmModelName: 'gpt-4o-mini' }])).toEqual([
      { provider: 'openai', count: 2 },
      { provider: 'anthropic', count: 1 },
      { provider: 'moonshot', count: 1 },
    ]);
  });

  it('is empty for an empty catalog', () => {
    expect(providerFacets([])).toEqual([]);
  });
});

describe('maxBlendedCostOf', () => {
  it('rounds the dearest blended price up', () => {
    // Claude blends to $9.00; ceil leaves it at 9.
    expect(maxBlendedCostOf(catalog)).toBe(9);
  });

  it('is null when nothing is priced', () => {
    expect(maxBlendedCostOf([unpriced])).toBeNull();
  });
});

describe('isFilterActive', () => {
  it('is false for the empty state and true once anything is set', () => {
    expect(isFilterActive(EMPTY_FILTERS)).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTERS, search: '  ' })).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTERS, search: 'gpt' })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTERS, minContext: 32_000 })).toBe(true);
  });
});

describe('toggleValue', () => {
  it('adds a missing value and removes a present one', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });
});
