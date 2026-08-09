// -----------------------------------------------------------------------
// "What does $0.50 actually buy me?" - the pure logic behind the homepage
// map. Everything here works off the live /models catalog; nothing invents
// a price or a rate.
// -----------------------------------------------------------------------

import type { Model } from './models';
import { hasCost, blendedCostPerMillion } from './models';
import type { FxRates, CurrencyCode } from './currency';
import { convertUsdToLocal, formatCurrency, formatUsd, isCurrencySupported } from './currency';

// Flagship families, best-known first. A model is "top" if its id or name
// mentions one of these; ties inside a family are broken by price.
export const TOP_MODEL_FAMILIES: readonly string[] = [
  'gpt',
  'claude',
  'gemini',
  'grok',
  'llama',
  'deepseek',
  'kimi',
  'mistral',
  'qwen',
  'command',
];

export function modelFamily(model: Model): string | null {
  const haystack = `${model?.litellmModelName ?? ''} ${model?.name ?? ''}`.toLowerCase();
  return TOP_MODEL_FAMILIES.find((family) => haystack.includes(family)) ?? null;
}

/**
 * Pick the headline models to quote a price for: one per recognised
 * flagship family, in family order, topped up with the cheapest remaining
 * priced models if the catalog doesn't cover enough families.
 */
export function selectTopModels(models: Model[] = [], limit: number = 5): Model[] {
  const priced = models.filter(hasCost);
  const byFamily = new Map<string, Model>();
  const rest: Model[] = [];

  priced.forEach((model) => {
    const family = modelFamily(model);
    if (!family) {
      rest.push(model);
      return;
    }
    const incumbent = byFamily.get(family);
    if (!incumbent || blendedCostPerMillion(model)! < blendedCostPerMillion(incumbent)!) {
      if (incumbent) rest.push(incumbent);
      byFamily.set(family, model);
    } else {
      rest.push(model);
    }
  });

  const ranked = TOP_MODEL_FAMILIES.map((family) => byFamily.get(family)).filter(
    (model): model is Model => Boolean(model)
  );
  const fillers = rest.sort((a, b) => blendedCostPerMillion(a)! - blendedCostPerMillion(b)!);

  return [...ranked, ...fillers].slice(0, limit);
}

/**
 * models.dev dates arrive as "2026-07-09" or, when a provider only published
 * a month, "2026-01". Both sort correctly as plain strings; anything missing
 * sorts last.
 */
function releaseKey(model: Model): string {
  return model.release_date ?? '';
}

/**
 * The newest model in each recognised family, most recent first - one entry
 * per family, no backfilling. Ties inside a family (OpenAI shipped three
 * GPT-5.6 variants on one day) go to the cheaper model, which is the one this
 * audience can actually reach.
 *
 * `selectTopModels` picks cheapest-per-family and tops the list up with
 * runners-up, which is right for the globe's five tags but surfaces last
 * year's mini models in a place that says "latest".
 */
export function selectLatestPerFamily(models: Model[] = []): Model[] {
  const byFamily = new Map<string, Model>();

  models.filter(hasCost).forEach((model) => {
    const family = modelFamily(model);
    if (!family) return;
    const incumbent = byFamily.get(family);
    if (!incumbent) {
      byFamily.set(family, model);
      return;
    }
    const newer = releaseKey(model).localeCompare(releaseKey(incumbent));
    const cheaper = blendedCostPerMillion(model)! < blendedCostPerMillion(incumbent)!;
    if (newer > 0 || (newer === 0 && cheaper)) byFamily.set(family, model);
  });

  return [...byFamily.values()].sort((a, b) => releaseKey(b).localeCompare(releaseKey(a)));
}

/** Shortest rule we'll draw, so the priciest model is still a readable mark. */
const MIN_REACH_PERCENT = 12;

/**
 * Rule lengths for a set of token yields.
 *
 * Across the full catalog the spread is roughly 40x - DeepSeek V4 Flash buys
 * 2.4M tokens for what Kimi K3 gives 56K - so drawing these linearly leaves
 * most rows as identical 2px slivers and the comparison stops working. These
 * are spaced logarithmically between the cheapest and dearest on show, which
 * keeps the ranking exact and the differences visible. The token counts
 * printed next to each rule remain the precise figures.
 */
export function reachPercentages(tokenCounts: Array<number | null>): number[] {
  const valid = tokenCounts.filter((t): t is number => typeof t === 'number' && t > 0);
  if (valid.length === 0) return tokenCounts.map(() => 0);

  const max = Math.max(...valid);
  const min = Math.min(...valid);
  // Every model on show buys the same amount: one full-length rule each.
  if (max === min) return tokenCounts.map((t) => (t && t > 0 ? 100 : 0));

  const span = Math.log10(max) - Math.log10(min);
  return tokenCounts.map((tokens) => {
    if (!tokens || tokens <= 0) return 0;
    const position = (Math.log10(tokens) - Math.log10(min)) / span;
    return MIN_REACH_PERCENT + position * (100 - MIN_REACH_PERCENT);
  });
}

/** "2026-07-09" -> "Jul 2026". Returns null for a date we can't read. */
export function formatReleaseMonth(releaseDate?: string): string | null {
  if (!releaseDate) return null;
  const match = /^(\d{4})-(\d{2})/.exec(releaseDate);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[month - 1]} ${match[1]}`;
}

/** How many tokens `usdAmount` buys at a model's blended input/output rate. */
export function tokensForUsd(usdAmount: number, model: Model): number | null {
  const perMillion = blendedCostPerMillion(model);
  if (perMillion === null || perMillion <= 0) return null;
  return (usdAmount / perMillion) * 1_000_000;
}

export function formatTokenCount(tokens: number | null): string {
  if (typeof tokens !== 'number' || !Number.isFinite(tokens)) return '—';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens >= 10_000_000 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1000)}K`;
  return String(Math.round(tokens));
}

/**
 * Format a USD amount in `currencyCode` when the FX service actually quotes
 * that currency, and in USD when it doesn't - never a guessed rate.
 */
export function formatLocalOrUsd(
  usdAmount: number,
  fxRates: FxRates | null | undefined,
  currencyCode?: CurrencyCode
): { text: string; isLocal: boolean } {
  if (fxRates && currencyCode && isCurrencySupported(fxRates, currencyCode)) {
    return {
      text: formatCurrency(convertUsdToLocal(usdAmount, fxRates, currencyCode), currencyCode),
      isLocal: true,
    };
  }
  return { text: formatUsd(usdAmount), isLocal: false };
}

export interface ModelQuote {
  model: Model;
  tokens: number | null;
  tokensLabel: string;
  perMillion: { text: string; isLocal: boolean };
}

/** Price an already-chosen list: what the reference amount buys, and at what rate. */
export function quoteModels(
  models: Model[],
  usdAmount: number,
  fxRates: FxRates | null | undefined,
  currencyCode?: CurrencyCode
): ModelQuote[] {
  return models.map((model) => {
    const tokens = tokensForUsd(usdAmount, model);
    return {
      model,
      tokens,
      tokensLabel: formatTokenCount(tokens),
      perMillion: formatLocalOrUsd(blendedCostPerMillion(model)!, fxRates, currencyCode),
    };
  });
}

/** One priced row per top model: what the reference amount buys, and at what rate. */
export function buildModelQuotes(
  models: Model[],
  usdAmount: number,
  fxRates: FxRates | null | undefined,
  currencyCode?: CurrencyCode,
  limit: number = 5
): ModelQuote[] {
  return quoteModels(selectTopModels(models, limit), usdAmount, fxRates, currencyCode);
}
