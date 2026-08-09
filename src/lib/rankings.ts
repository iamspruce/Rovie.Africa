// -----------------------------------------------------------------------
// The rankings page's domain logic: the shape account-service returns, and
// the pure functions that turn it into something a chart can draw.
//
// Everything here is aggregate usage from `GET /stats/rankings` - real
// traffic through the proxy, never an estimate. Where a figure isn't
// available (an app that doesn't identify itself, a model with too few
// requests to time), the answer is an absence the page reports, not a
// number we invent.
// -----------------------------------------------------------------------

export interface ModelUsage {
  model: string;
  provider: string | null;
  tokens: number;
  spendUsd: number;
  requests: number;
}

export interface ProviderUsage {
  provider: string;
  tokens: number;
  spendUsd: number;
  requests: number;
}

export interface TrendPoint {
  date: string;
  tokens: number;
  spendUsd: number;
  requests: number;
}

export interface CountryUsage {
  /** ISO 3166-1 alpha-2, from the country captured at signup. */
  country: string;
  tokens: number;
  spendUsd: number;
  developers: number;
  topModel: string | null;
}

export interface ModelLatency {
  model: string;
  medianMs: number;
  medianTokensPerSecond: number;
  medianFirstTokenMs: number | null;
  requests: number;
}

export interface SessionCost {
  sessions: number;
  medianSpendUsd: number;
  p90SpendUsd: number;
  medianTokens: number;
  medianRequests: number;
}

export interface ContextUsage {
  model: string;
  medianPromptTokens: number;
  p90PromptTokens: number;
  maxPromptTokens: number;
  requests: number;
}

export interface ToolUsage {
  tool: string;
  calls: number;
}

export interface AppUsage {
  app: string;
  tokens: number;
  requests: number;
}

export interface RankingsSnapshot {
  windowDays: number;
  since: string;
  generatedAt: string;
  totals: {
    tokens: number;
    spendUsd: number;
    requests: number;
    developers: number;
    countries: number;
  };
  trend: TrendPoint[];
  models: ModelUsage[];
  providers: ProviderUsage[];
  countries: CountryUsage[];
  latency: ModelLatency[];
  sessions: SessionCost;
  context: ContextUsage[];
  tools: ToolUsage[];
  apps: AppUsage[];
}

export const WINDOW_OPTIONS: readonly { days: number; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

export const DEFAULT_WINDOW_DAYS = 30;

/** A row ready to draw as a bar: its share of the largest value in the set. */
export interface RankedRow {
  key: string;
  label: string;
  value: number;
  /** 0-100, relative to the biggest row - the bar's length. */
  barPercent: number;
  /** 0-100, this row's share of the total - the number people actually quote. */
  sharePercent: number;
  /** Optional second line under the label. */
  sublabel?: string;
}

/**
 * Turn any {label, value} list into bar rows.
 *
 * Bars are scaled against the LARGEST row, not the total: at realistic
 * shares (a leader on 30%) scaling by total leaves every bar a stub and the
 * comparison stops working. The share percentage is printed alongside, so
 * the exact figure is never left to be read off a bar's length.
 */
export function toRankedRows(
  items: { key: string; label: string; value: number; sublabel?: string }[]
): RankedRow[] {
  const max = Math.max(0, ...items.map((item) => item.value));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return items.map((item) => ({
    ...item,
    barPercent: max > 0 ? (item.value / max) * 100 : 0,
    sharePercent: total > 0 ? (item.value / total) * 100 : 0,
  }));
}

/**
 * The providers to colour individually, with everything past the eighth
 * folded into "Other". Eight is the categorical token ceiling; a ninth hue
 * would be indistinguishable from an existing one for a colourblind reader.
 */
export const MAX_COLOURED_SERIES = 8;

export function foldProviderTail(
  providers: ProviderUsage[],
  limit: number = MAX_COLOURED_SERIES
): { provider: string; tokens: number; isOther: boolean }[] {
  const sorted = [...providers].sort((a, b) => b.tokens - a.tokens);
  if (sorted.length <= limit) {
    return sorted.map((p) => ({ provider: p.provider, tokens: p.tokens, isOther: false }));
  }
  const head = sorted.slice(0, limit - 1);
  const tail = sorted.slice(limit - 1);
  return [
    ...head.map((p) => ({ provider: p.provider, tokens: p.tokens, isOther: false })),
    {
      provider: 'Other',
      tokens: tail.reduce((sum, p) => sum + p.tokens, 0),
      isOther: true,
    },
  ];
}

/** "12.4B", "907M", "43K". Token counts run to billions; nobody reads 12,438,201,904. */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(value));
}

/** Durations people can feel: "820ms", "1.4s". */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/** "8 Aug" - axis ticks and tooltips, never a full ISO string. */
export function formatShortDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}`;
}

/**
 * Whether there's enough traffic for a section to say anything. A ranking
 * built from three requests is noise wearing a chart's clothes, so sections
 * below this render their "not enough traffic yet" state instead.
 */
export function hasEnoughData(rows: unknown[] | null | undefined, minimum: number = 1): boolean {
  return Array.isArray(rows) && rows.length >= minimum;
}

/**
 * Share of traffic attributed to a named app. Clients identify themselves
 * with a header (see docs/client-setup.md), so this is always a floor -
 * which is why the page prints it rather than presenting the app list as
 * the whole picture.
 */
export function attributedShare(apps: AppUsage[], totalTokens: number): number | null {
  if (!totalTokens || apps.length === 0) return null;
  const attributed = apps.reduce((sum, app) => sum + app.tokens, 0);
  return Math.min(100, (attributed / totalTokens) * 100);
}

/**
 * How much of its advertised context window a model is actually given, as a
 * percentage. Needs the catalog's limit, so it returns null for a model the
 * catalog doesn't price - never a guess at the window.
 */
export function contextFillPercent(
  usage: ContextUsage,
  contextWindow: number | undefined
): number | null {
  if (!contextWindow || contextWindow <= 0) return null;
  return Math.min(100, (usage.p90PromptTokens / contextWindow) * 100);
}
