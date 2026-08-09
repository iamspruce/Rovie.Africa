/** What a model can take in / give back, per models.dev's `modalities`. */
export type Modality = 'text' | 'image' | 'audio' | 'video' | 'pdf';

export interface Model {
  litellmModelName: string;
  provider: string;
  name: string;
  /** models.dev's canonical id, e.g. "anthropic/claude-sonnet-5". */
  id?: string;
  description?: string;
  /** Lineage as models.dev groups it. Not the same as `modelFamily()`, which infers from the name. */
  family?: string;
  limit?: {
    context?: number;
    input?: number;
    output?: number;
  };
  /**
   * USD per ONE MILLION tokens, passed through from models.dev by
   * account-service's /models route - e.g. GPT-4o is `{ input: 2.5, output: 10 }`,
   * meaning $2.50 and $10.00 per million. Not per-token: treating it that way
   * put figures out by a factor of a million.
   */
  cost?: {
    input: number;
    output: number;
    /** Reading from cache, same per-million basis. Much cheaper than a fresh input token. */
    cache_read?: number;
    cache_write?: number;
  };
  modalities?: {
    input?: Modality[];
    output?: Modality[];
  };
  /** Function/tool calling. */
  tool_call?: boolean;
  /** Extended thinking. */
  reasoning?: boolean;
  /** JSON-schema-constrained responses. */
  structured_output?: boolean;
  /** Accepts file attachments. */
  attachment?: boolean;
  /** `temperature` is an accepted parameter (reasoning models often fix it). */
  temperature?: boolean;
  /** Weights are published — runnable outside a provider's API. */
  open_weights?: boolean;
  /** Training cutoff, "2025-04" or "2025-04-01". */
  knowledge?: string;
  /** ISO-ish date from models.dev: "2026-07-09", or "2026-01" when the provider only gave a month. */
  release_date?: string;
  last_updated?: string;
  /** models.dev marks some entries "beta" / "deprecated"; most carry nothing. */
  status?: string;
}

/**
 * The capability flags worth filtering on, in the order they're shown. Each
 * is a plain boolean on the model, so a facet is just a key lookup.
 */
export const MODEL_CAPABILITIES = [
  { key: 'tool_call', label: 'Tools' },
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'structured_output', label: 'Structured output' },
  { key: 'attachment', label: 'Attachments' },
  { key: 'open_weights', label: 'Open weights' },
] as const satisfies readonly { key: keyof Model; label: string }[];

export type CapabilityKey = (typeof MODEL_CAPABILITIES)[number]['key'];

export const MODALITIES: readonly Modality[] = ['text', 'image', 'audio', 'video', 'pdf'];

export interface RankedModel {
  model: Model;
  blendedCostPerMillion: number | null;
}

export function hasCost(model: Model): boolean {
  return typeof model?.cost?.input === 'number' && typeof model?.cost?.output === 'number';
}

export function blendedCostPerMillion(model: Model): number | null {
  if (!hasCost(model)) return null;
  return (model.cost!.input + model.cost!.output) / 2;
}

export function sortModelsByAffordability(models: Model[] = []): RankedModel[] {
  return models
    .filter(hasCost)
    .map((model) => ({ model, blendedCostPerMillion: blendedCostPerMillion(model) }))
    .sort((a, b) => a.blendedCostPerMillion! - b.blendedCostPerMillion!);
}

export function formatCostPerMillion(usdPerMillion: number): string {
  if (typeof usdPerMillion !== 'number') return 'Pricing unavailable';
  return `$${usdPerMillion.toFixed(2)} / 1M tokens`;
}

export function formatTokenLimit(tokens: number): string {
  if (typeof tokens !== 'number') return '\u2014';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
}

/** Every capability the model declares, for the badges under its name. */
export function capabilitiesOf(model: Model): { key: CapabilityKey; label: string }[] {
  return MODEL_CAPABILITIES.filter((capability) => model?.[capability.key] === true).map(
    ({ key, label }) => ({ key, label })
  );
}

/**
 * Input modalities, always including text. models.dev omits `modalities` on
 * some entries, and every model we route to is at minimum a text model - a
 * blank cell there would read as "takes no input" rather than "not stated".
 */
export function inputModalities(model: Model): Modality[] {
  const declared = model?.modalities?.input;
  if (!declared || declared.length === 0) return ['text'];
  return MODALITIES.filter((modality) => declared.includes(modality));
}

/** "2025-04" / "2025-04-01" -> "Apr 2025". Null when models.dev gave nothing readable. */
export function formatMonth(date?: string): string | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})/.exec(date);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[month - 1]} ${match[1]}`;
}

/**
 * How much cheaper a cached input token is than a fresh one, as "90% off".
 * Null when the model doesn't publish a cache rate, or when caching saves
 * nothing - a 0% badge is noise.
 */
export function cacheDiscountPercent(model: Model): number | null {
  const input = model?.cost?.input;
  const cacheRead = model?.cost?.cache_read;
  if (typeof input !== 'number' || typeof cacheRead !== 'number' || input <= 0) return null;
  const discount = Math.round((1 - cacheRead / input) * 100);
  return discount > 0 ? discount : null;
}
