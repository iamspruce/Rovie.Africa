// -----------------------------------------------------------------------
// The logic behind the /models filter rail. Pure functions over the catalog
// so the page component stays presentational and this stays testable.
//
// Everything here is O(n) over a catalog of a few dozen models, deliberately:
// a table library and its indexes would cost more than they save at this
// size. Revisit if the catalog passes a few hundred rows.
// -----------------------------------------------------------------------

import type { CapabilityKey, Modality, Model } from './models';
import { blendedCostPerMillion, hasCost, inputModalities } from './models';

export interface ModelFilterState {
  /** Free text, matched against display name, LiteLLM id, and provider. */
  search: string;
  providers: string[];
  /** A model must accept ALL of these, so "image + pdf" means both. */
  modalities: Modality[];
  /** A model must declare ALL of these. */
  capabilities: CapabilityKey[];
  /** USD per million, blended. Null = no ceiling. */
  maxBlendedCost: number | null;
  /** Tokens. Null = no floor. */
  minContext: number | null;
}

export const EMPTY_FILTERS: ModelFilterState = {
  search: '',
  providers: [],
  modalities: [],
  capabilities: [],
  maxBlendedCost: null,
  minContext: null,
};

export type SortKey =
  | 'cost-asc'
  | 'cost-desc'
  | 'context-desc'
  | 'newest'
  | 'name-asc'
  | 'provider-asc';

export const SORT_OPTIONS: readonly { key: SortKey; label: string }[] = [
  { key: 'cost-asc', label: 'Price: low to high' },
  { key: 'cost-desc', label: 'Price: high to low' },
  { key: 'context-desc', label: 'Context: largest first' },
  { key: 'newest', label: 'Newest first' },
  { key: 'name-asc', label: 'Name (A–Z)' },
  { key: 'provider-asc', label: 'Provider (A–Z)' },
];

export const DEFAULT_SORT: SortKey = 'cost-asc';

export function isFilterActive(filters: ModelFilterState): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.providers.length > 0 ||
    filters.modalities.length > 0 ||
    filters.capabilities.length > 0 ||
    filters.maxBlendedCost !== null ||
    filters.minContext !== null
  );
}

/** Toggle one value in a facet array, preserving the rest. */
export function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

function matchesSearch(model: Model, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const haystack = [model.name, model.litellmModelName, model.provider, model.family]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  // Every whitespace-separated word must appear somewhere, so "claude haiku"
  // narrows rather than widening to everything matching either word.
  return term.split(/\s+/).every((word) => haystack.includes(word));
}

export function filterModels(models: Model[] = [], filters: ModelFilterState): Model[] {
  return models.filter((model) => {
    if (!matchesSearch(model, filters.search)) return false;
    if (filters.providers.length > 0 && !filters.providers.includes(model.provider)) return false;

    if (filters.capabilities.length > 0) {
      if (!filters.capabilities.every((capability) => model[capability] === true)) return false;
    }

    if (filters.modalities.length > 0) {
      const supported = inputModalities(model);
      if (!filters.modalities.every((modality) => supported.includes(modality))) return false;
    }

    if (filters.maxBlendedCost !== null) {
      const blended = blendedCostPerMillion(model);
      // An unpriced model can't be shown to be under a budget, so a price
      // ceiling excludes it rather than quietly letting it through.
      if (blended === null || blended > filters.maxBlendedCost) return false;
    }

    if (filters.minContext !== null) {
      if ((model.limit?.context ?? 0) < filters.minContext) return false;
    }

    return true;
  });
}

/** Sorts missing values last regardless of direction, so gaps never lead. */
function compareOptional(a: number | null, b: number | null, direction: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
}

export function sortModels(models: Model[] = [], sort: SortKey): Model[] {
  const sorted = [...models];
  switch (sort) {
    case 'cost-asc':
      return sorted.sort((a, b) =>
        compareOptional(blendedCostPerMillion(a), blendedCostPerMillion(b), 1)
      );
    case 'cost-desc':
      return sorted.sort((a, b) =>
        compareOptional(blendedCostPerMillion(a), blendedCostPerMillion(b), -1)
      );
    case 'context-desc':
      return sorted.sort((a, b) =>
        compareOptional(a.limit?.context ?? null, b.limit?.context ?? null, -1)
      );
    case 'newest':
      // models.dev dates are zero-padded, so string order is date order.
      // Anything undated sorts last rather than reading as ancient.
      return sorted.sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''));
    case 'provider-asc':
      return sorted.sort(
        (a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name)
      );
    case 'name-asc':
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function filterAndSortModels(
  models: Model[] = [],
  filters: ModelFilterState,
  sort: SortKey
): Model[] {
  return sortModels(filterModels(models, filters), sort);
}

/**
 * Providers present in the catalog with how many models each has, most
 * models first. Drives the provider facet, so it can never offer a provider
 * the catalog doesn't carry.
 */
export function providerFacets(models: Model[] = []): { provider: string; count: number }[] {
  const counts = new Map<string, number>();
  models.forEach((model) => {
    if (!model.provider) return;
    counts.set(model.provider, (counts.get(model.provider) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count || a.provider.localeCompare(b.provider));
}

/**
 * Blended price of the dearest priced model, rounded up — the top of the
 * price slider. Null when nothing in the catalog is priced, in which case
 * the slider shouldn't render at all.
 */
export function maxBlendedCostOf(models: Model[] = []): number | null {
  const priced = models.filter(hasCost).map((model) => blendedCostPerMillion(model)!);
  if (priced.length === 0) return null;
  return Math.ceil(Math.max(...priced));
}

/** Context-window floors offered in the filter rail, in tokens. */
export const CONTEXT_STEPS: readonly { value: number; label: string }[] = [
  { value: 32_000, label: '32K+' },
  { value: 128_000, label: '128K+' },
  { value: 200_000, label: '200K+' },
  { value: 1_000_000, label: '1M+' },
];
