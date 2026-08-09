// -----------------------------------------------------------------------
// Sample data for the rankings page, for looking at the layout before real
// traffic exists.
//
// This is FABRICATED. Everything the rankings page normally shows is
// measured, and the page's whole claim is that its figures are real - so
// this is behind an explicit opt-in that production builds don't get by
// default, and the page prints a banner whenever it's what's on screen.
// Never make this a fallback for a failed fetch: an API outage would then
// quietly replace real numbers with invented ones on a public page.
// -----------------------------------------------------------------------

import type { RankingsSnapshot } from './rankings';

/**
 * On in dev, or wherever VITE_MOCK_RANKINGS=true was set at build time.
 * `?demo=1` turns it on without a restart; `?demo=0` forces it off so the
 * real endpoint can be tested in dev.
 */
export function isDemoMode(): boolean {
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const override = params?.get('demo');
  if (override === '1' || override === 'true') return true;
  if (override === '0' || override === 'false') return false;
  return import.meta.env.VITE_MOCK_RANKINGS === 'true';
}

/** Deterministic PRNG, so the sample data doesn't reshuffle on every render. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MODELS: { model: string; provider: string; weight: number; tps: number; ttft: number }[] = [
  { model: 'claude-sonnet-5', provider: 'anthropic', weight: 100, tps: 61.4, ttft: 690 },
  { model: 'kimi-k2.5', provider: 'moonshot', weight: 74, tps: 96.2, ttft: 380 },
  { model: 'gpt-5.6-terra', provider: 'openai', weight: 61, tps: 72.8, ttft: 540 },
  { model: 'gemini-3.6-flash', provider: 'google', weight: 47, tps: 128.5, ttft: 260 },
  { model: 'deepseek-v4-flash', provider: 'deepseek', weight: 39, tps: 110.3, ttft: 310 },
  { model: 'claude-haiku-4-5', provider: 'anthropic', weight: 31, tps: 104.7, ttft: 290 },
  { model: 'gpt-4o-mini', provider: 'openai', weight: 24, tps: 88.1, ttft: 420 },
  { model: 'grok-4.5', provider: 'xai', weight: 18, tps: 58.9, ttft: 810 },
  { model: 'qwen3.8-max', provider: 'alibaba', weight: 13, tps: 44.2, ttft: 940 },
  { model: 'gpt-5.6-sol', provider: 'openai', weight: 11, tps: 38.6, ttft: 1180 },
  { model: 'mistral-small', provider: 'mistral', weight: 8, tps: 92.4, ttft: 350 },
  { model: 'claude-opus-4-5', provider: 'anthropic', weight: 6, tps: 34.1, ttft: 1320 },
  { model: 'command-a-plus', provider: 'cohere', weight: 4, tps: 66.0, ttft: 620 },
  { model: 'kimi-k3', provider: 'moonshot', weight: 3, tps: 81.7, ttft: 470 },
];

// Weighted so the shape looks like a real market: one dominant country, a
// few strong ones, a long tail that still shows on the map.
const COUNTRIES: { alpha2: string; weight: number; developers: number }[] = [
  { alpha2: 'NG', weight: 100, developers: 4820 },
  { alpha2: 'KE', weight: 52, developers: 2140 },
  { alpha2: 'ZA', weight: 44, developers: 1810 },
  { alpha2: 'EG', weight: 31, developers: 1290 },
  { alpha2: 'GH', weight: 27, developers: 1105 },
  { alpha2: 'UG', weight: 16, developers: 690 },
  { alpha2: 'TZ', weight: 13, developers: 545 },
  { alpha2: 'ET', weight: 11, developers: 470 },
  { alpha2: 'MA', weight: 9, developers: 395 },
  { alpha2: 'RW', weight: 8, developers: 340 },
  { alpha2: 'SN', weight: 6, developers: 265 },
  { alpha2: 'CI', weight: 5, developers: 220 },
  { alpha2: 'CM', weight: 4, developers: 185 },
  { alpha2: 'ZM', weight: 3, developers: 140 },
  { alpha2: 'TN', weight: 3, developers: 128 },
  { alpha2: 'ZW', weight: 2, developers: 96 },
  { alpha2: 'DZ', weight: 2, developers: 84 },
  { alpha2: 'BJ', weight: 1, developers: 47 },
  { alpha2: 'MU', weight: 1, developers: 39 },
  { alpha2: 'BW', weight: 1, developers: 28 },
];

const TOOLS = [
  { tool: 'filesystem/read_file', weight: 100 },
  { tool: 'filesystem/write_file', weight: 63 },
  { tool: 'shell/run_command', weight: 48 },
  { tool: 'git/status', weight: 31 },
  { tool: 'github/create_issue', weight: 19 },
  { tool: 'postgres/query', weight: 14 },
  { tool: 'browser/navigate', weight: 9 },
  { tool: 'slack/post_message', weight: 5 },
];

const APPS = [
  { app: 'opencode', weight: 100 },
  { app: 'cline', weight: 58 },
  { app: 'continue', weight: 34 },
  { app: 'aider', weight: 21 },
  { app: 'roo-code', weight: 12 },
  { app: 'zed', weight: 7 },
];

/** Tokens per day at the top of the distribution, before window scaling. */
const DAILY_TOKENS_BASE = 620_000_000;
/** Rough blended cost, so spend tracks tokens instead of being a second invention. */
const USD_PER_MILLION = 0.42;

export function buildMockRankings(windowDays: number): RankingsSnapshot {
  const random = mulberry32(windowDays * 7919);
  const today = new Date();

  const trend = Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (windowDays - 1 - index));
    // Gentle upward drift, a weekend dip, and some daily noise.
    const growth = 0.55 + (index / windowDays) * 0.75;
    const weekend = [0, 6].includes(date.getUTCDay()) ? 0.68 : 1;
    const noise = 0.85 + random() * 0.3;
    const tokens = Math.round(DAILY_TOKENS_BASE * growth * weekend * noise);
    return {
      date: date.toISOString().slice(0, 10),
      tokens,
      spendUsd: (tokens / 1_000_000) * USD_PER_MILLION,
      requests: Math.round(tokens / 13_400),
    };
  });

  const totalTokens = trend.reduce((sum, point) => sum + point.tokens, 0);
  const totalRequests = trend.reduce((sum, point) => sum + point.requests, 0);
  const totalSpend = trend.reduce((sum, point) => sum + point.spendUsd, 0);

  const share = <T extends { weight: number }>(items: T[]) => {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    return items.map((item) => ({ ...item, fraction: item.weight / total }));
  };

  const models = share(MODELS).map((entry) => ({
    model: entry.model,
    provider: entry.provider,
    tokens: Math.round(totalTokens * entry.fraction),
    spendUsd: (totalTokens * entry.fraction * USD_PER_MILLION) / 1_000_000,
    requests: Math.round(totalRequests * entry.fraction),
  }));

  const providerTotals = new Map<string, { tokens: number; spendUsd: number; requests: number }>();
  models.forEach((model) => {
    const current = providerTotals.get(model.provider!) ?? { tokens: 0, spendUsd: 0, requests: 0 };
    providerTotals.set(model.provider!, {
      tokens: current.tokens + model.tokens,
      spendUsd: current.spendUsd + model.spendUsd,
      requests: current.requests + model.requests,
    });
  });

  const providers = [...providerTotals.entries()]
    .map(([provider, totals]) => ({ provider, ...totals }))
    .sort((a, b) => b.tokens - a.tokens);

  const countries = share(COUNTRIES).map((entry, index) => ({
    country: entry.alpha2,
    tokens: Math.round(totalTokens * entry.fraction),
    spendUsd: (totalTokens * entry.fraction * USD_PER_MILLION) / 1_000_000,
    developers: entry.developers,
    // Bigger markets skew to the frontier model; smaller ones to the cheap one.
    topModel: index < 3 ? 'claude-sonnet-5' : index < 8 ? 'kimi-k2.5' : 'gemini-3.6-flash',
  }));

  const latency = [...MODELS]
    .map((entry) => ({
      model: entry.model,
      medianMs: Math.round((1_000 / entry.tps) * 1_400 + entry.ttft),
      medianTokensPerSecond: entry.tps,
      medianFirstTokenMs: entry.ttft,
      requests: Math.round(totalRequests * (entry.weight / 400)),
    }))
    .filter((entry) => entry.requests >= 20)
    .sort((a, b) => b.medianTokensPerSecond - a.medianTokensPerSecond);

  const context = [...MODELS]
    .slice(0, 10)
    .map((entry, index) => {
      const p90 = Math.round(190_000 / (index + 1.4));
      return {
        model: entry.model,
        medianPromptTokens: Math.round(p90 * 0.22),
        p90PromptTokens: p90,
        maxPromptTokens: Math.round(p90 * 1.7),
        requests: Math.round(totalRequests * (entry.weight / 400)),
      };
    })
    .sort((a, b) => b.p90PromptTokens - a.p90PromptTokens);

  const toolTotal = TOOLS.reduce((sum, tool) => sum + tool.weight, 0);
  const tools = TOOLS.map((tool) => ({
    tool: tool.tool,
    calls: Math.round((totalRequests * 0.34 * tool.weight) / toolTotal),
  }));

  // Deliberately short of 100%: attribution is opt-in, so the page's "covers
  // N% of traffic" line should have something interesting to say.
  const attributedTokens = totalTokens * 0.62;
  const appTotal = APPS.reduce((sum, app) => sum + app.weight, 0);
  const apps = APPS.map((app) => ({
    app: app.app,
    tokens: Math.round((attributedTokens * app.weight) / appTotal),
    requests: Math.round((totalRequests * 0.62 * app.weight) / appTotal),
  }));

  const sessions = Math.round(totalRequests / 21);

  return {
    windowDays,
    since: trend[0]?.date ?? new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    totals: {
      tokens: totalTokens,
      spendUsd: totalSpend,
      requests: totalRequests,
      developers: COUNTRIES.reduce((sum, country) => sum + country.developers, 0),
      countries: countries.length,
    },
    trend,
    models,
    providers,
    countries,
    latency,
    sessions: {
      sessions,
      medianSpendUsd: 0.094,
      p90SpendUsd: 0.71,
      medianTokens: 38_400,
      medianRequests: 12,
    },
    context,
    tools,
    apps,
  };
}
