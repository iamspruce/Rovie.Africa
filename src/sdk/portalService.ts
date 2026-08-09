import { apiCall, RovieApiError } from './httpClient';
import { config } from './config';

/**
 * portal-api: sign-in, sign-up, and everything scoped to the signed-in user.
 *
 * Every call here sends the session cookie and none of them take a user id -
 * the server reads it from the session. That's the whole point of the
 * service: account-service is gated by one shared secret that grants access
 * to every user's data, so the browser is never given it and never names
 * whose account it wants.
 */

function portalCall<T>(path: string, options: Omit<Parameters<typeof apiCall>[0], 'baseUrl' | 'path'> = {}): Promise<T> {
  return apiCall({
    baseUrl: config.portalApiUrl,
    path,
    credentials: 'include',
    ...options,
  }) as Promise<T>;
}

// ---------------------------------------------------------------- session

export interface PortalUser {
  id: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  country: string;
  kycTier: number;
  createdAt: string;
  /** Balance, in USD, below which the user asked to be emailed. Null = off. */
  lowBalanceThresholdUsd: number | null;
}

export interface MeResponse {
  user: PortalUser;
  /** True for Google and magic-link signups, which carry no country. */
  needsCountry: boolean;
}

/**
 * The current user, or null when nobody is signed in.
 *
 * A 401 is the normal signed-out answer, not a failure, so it resolves to
 * null. Anything else still throws - a portal-api that's down must not look
 * like a signed-out visitor, or the app would bounce people to /signin every
 * time the service restarts.
 */
export async function getMe(signal?: AbortSignal): Promise<MeResponse | null> {
  try {
    return await portalCall<MeResponse>('/me', { signal });
  } catch (err) {
    if (err instanceof RovieApiError && err.status === 401) return null;
    throw err;
  }
}

export function updateMe(patch: {
  name?: string;
  country?: string;
  /** null turns the low-balance email off. */
  lowBalanceThresholdUsd?: number | null;
}): Promise<MeResponse> {
  return portalCall<MeResponse>('/me', { method: 'PATCH', body: patch });
}

/**
 * A ready-to-paste config block for a client tool, built server-side from
 * the same model list the proxy actually serves.
 *
 * Deliberately untyped past the client name: each tool's block has its own
 * shape (OpenCode gets a whole config file, everything else three values),
 * and the page renders whichever fields came back rather than asserting one.
 */
export interface ClientConfig {
  filename?: string;
  instructions?: string[];
  config?: unknown;
  baseURL?: string;
  models?: string[];
}

export function getClientConfig(
  client: 'generic' | 'opencode',
  signal?: AbortSignal
): Promise<ClientConfig> {
  return portalCall<ClientConfig>(`/me/client-config/${client}`, { signal });
}

export interface AuthMethods {
  google: boolean;
  magicLink: boolean;
  emailPassword: boolean;
}

/** Which sign-in methods this deployment has configured. */
export function getAuthMethods(signal?: AbortSignal): Promise<AuthMethods> {
  return portalCall<AuthMethods>('/auth-config', { signal });
}

// ------------------------------------------------------------------ auth
//
// Better Auth's own endpoints, called directly rather than through its
// client SDK - the app already has one HTTP layer and one error type, and a
// second would mean two ways for a request to fail.

export function signUpWithEmail(input: {
  email: string;
  password: string;
  name: string;
  country: string;
}): Promise<unknown> {
  return portalCall('/auth/sign-up/email', { method: 'POST', body: input });
}

export function signInWithEmail(input: { email: string; password: string }): Promise<unknown> {
  return portalCall('/auth/sign-in/email', { method: 'POST', body: input });
}

/**
 * Sends a one-time sign-in link. `callbackURL` is where portal-api sends the
 * browser after the link is verified - an absolute URL back into this app.
 */
export function sendMagicLink(input: { email: string; callbackURL: string }): Promise<unknown> {
  return portalCall('/auth/sign-in/magic-link', { method: 'POST', body: input });
}

export function signOut(): Promise<unknown> {
  return portalCall('/auth/sign-out', { method: 'POST', body: {} });
}

/**
 * Google is a full-page redirect, not a fetch: the browser has to visit
 * Google itself. Returning the URL rather than navigating keeps this module
 * free of side effects.
 */
export function googleSignInUrl(callbackURL: string): string {
  const url = new URL(`${config.portalApiUrl.replace(/\/+$/, '')}/auth/sign-in/social`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('callbackURL', callbackURL);
  return url.toString();
}

// -------------------------------------------------------------- api keys

/** What this key has cost over the window portal-api reports on. */
export interface ApiKeyUsage {
  windowDays: number;
  spendUsd: number;
  tokens: number;
  requests: number;
  lastUsedAt: string | null;
}

/** What the gateway enforces on this key. Null when it can't be read. */
export interface ApiKeyLimits {
  /** Lifetime, unlike `usage`, which covers a window. */
  lifetimeSpendUsd: number;
  /** Optional per-key cap. Null means the account balance alone governs. */
  maxBudgetUsd: number | null;
  tpmLimit: number | null;
  rpmLimit: number | null;
  maxParallelRequests: number | null;
  /** Empty means every model Rovie serves. */
  models: string[];
  blocked: boolean;
  expiresAt: string | null;
}

export interface ApiKeySummary {
  id: string;
  keyPrefix: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
  /** Null when LiteLLM's spend tables couldn't be read - never zero, which
   *  would claim the key was issued and never used. */
  usage: ApiKeyUsage | null;
  limits: ApiKeyLimits | null;
}

export function listApiKeys(signal?: AbortSignal): Promise<{ keys: ApiKeySummary[] }> {
  return portalCall<{ keys: ApiKeySummary[] }>('/me/api-keys', { signal });
}

/** The only time the full key is ever returned. Show it once, then forget it. */
export function createApiKey(label?: string): Promise<{ apiKey: string; shownOnce: true }> {
  return portalCall<{ apiKey: string; shownOnce: true }>('/me/api-keys', {
    method: 'POST',
    body: { label },
  });
}

/**
 * Replaces a key, keeping its label. Returns the new key once, like create -
 * the old one stops working the moment this resolves.
 */
export function rotateApiKey(id: string): Promise<{ apiKey: string; id: string; shownOnce: true }> {
  return portalCall<{ apiKey: string; id: string; shownOnce: true }>(
    `/me/api-keys/${encodeURIComponent(id)}/rotate`,
    { method: 'POST', body: {} }
  );
}

/**
 * Narrows one key. Omitted fields are left alone; null clears them.
 *
 * Both settings only ever restrict a key further, so neither can grant
 * access the account doesn't already have.
 */
export function updateApiKey(
  id: string,
  patch: { maxBudgetUsd?: number | null; models?: string[] | null }
): Promise<{ updated: boolean; details: ApiKeyLimits | null }> {
  return portalCall<{ updated: boolean; details: ApiKeyLimits | null }>(
    `/me/api-keys/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: patch }
  );
}

export function revokeApiKey(id: string): Promise<{ revoked: boolean }> {
  return portalCall<{ revoked: boolean }>(`/me/api-keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// --------------------------------------------------------------- billing

export interface PortalBalance {
  availableUsd: number;
  spendUsd: number;
  maxBudgetUsd: number;
  /**
   * What the local figures below are actually quoted in. Not always what was
   * asked for: a country whose currency has no FX rate falls back to USD, and
   * this says so rather than labelling dollars with the wrong symbol.
   */
  localCurrency: string;
  availableLocal: number;
  spendLocal: number;
  maxBudgetLocal: number;
  /** Legacy alias for localCurrency. Always equal to it. */
  currency: string;
  country: string;
}

export function getBalance(currency: string, signal?: AbortSignal): Promise<PortalBalance> {
  return portalCall<PortalBalance>('/me/balance', { query: { currency }, signal });
}

export interface PortalPayment {
  id: string;
  provider: string;
  currency: string;
  /** Minor units as a string - JSON has no integer type wide enough. */
  amountMinor: string;
  usdCreditedMicros: string | null;
  status: 'pending' | 'success' | 'failed' | 'expired';
  createdAt: string;
  confirmedAt: string | null;
}

export function listPayments(signal?: AbortSignal): Promise<{ payments: PortalPayment[] }> {
  return portalCall<{ payments: PortalPayment[] }>('/me/payments', { signal });
}

// ----------------------------------------------------------------- usage
//
// The signed-in user's own traffic, read from the same LiteLLM tables that
// enforce their balance - so "where did the money go" and "how much is left"
// can never disagree. Aggregates only; prompts and responses are never
// returned by any of these.

export interface UsageTrendPoint {
  date: string;
  tokens: number;
  spendUsd: number;
  requests: number;
}

export interface UsageByModel {
  model: string;
  provider: string | null;
  tokens: number;
  spendUsd: number;
  requests: number;
  failedRequests: number;
}

export interface UsageByProvider {
  provider: string;
  tokens: number;
  spendUsd: number;
  requests: number;
}

/** A tag the client sent in x-litellm-tags. Empty until clients send them. */
export interface UsageByProject {
  tag: string;
  tokens: number;
  spendUsd: number;
  requests: number;
}

export interface UsageSessions {
  sessions: number;
  medianSpendUsd: number;
  p90SpendUsd: number;
  medianTokens: number;
  medianRequests: number;
}

export interface UsageLatency {
  model: string;
  medianMs: number;
  medianTokensPerSecond: number;
  medianFirstTokenMs: number | null;
  requests: number;
}

export interface UsageTotals {
  tokens: number;
  promptTokens: number;
  completionTokens: number;
  spendUsd: number;
  requests: number;
  successfulRequests: number;
  failedRequests: number;
  /** Prompt tokens served from the provider's cache. Tokens, not dollars -
   *  the discount differs per provider and we don't invent a figure. */
  cachedTokens: number;
}

export interface UsageSnapshot {
  windowDays: number;
  since: string;
  generatedAt: string;
  totals: UsageTotals;
  trend: UsageTrendPoint[];
  models: UsageByModel[];
  providers: UsageByProvider[];
  projects: UsageByProject[];
  sessions: UsageSessions;
  latency: UsageLatency[];
}

export function getUsage(windowDays: number, signal?: AbortSignal): Promise<UsageSnapshot> {
  return portalCall<UsageSnapshot>('/me/usage', {
    query: { window: String(windowDays) },
    signal,
  });
}

export interface UsageRequest {
  id: string;
  startedAt: string;
  model: string | null;
  provider: string | null;
  /** 'success' or whatever LiteLLM recorded for the failure. */
  status: string;
  spendUsd: number;
  promptTokens: number;
  completionTokens: number;
  durationMs: number | null;
  cacheHit: boolean;
  sessionId: string | null;
  /** The key that made the call, named as the user labelled it. */
  keyLabel: string | null;
  keyPrefix: string | null;
}

export function listRequests(
  options: { limit?: number; onlyFailures?: boolean } = {},
  signal?: AbortSignal
): Promise<{ requests: UsageRequest[] }> {
  return portalCall<{ requests: UsageRequest[] }>('/me/requests', {
    query: {
      limit: String(options.limit ?? 50),
      ...(options.onlyFailures ? { failures: '1' } : {}),
    },
    signal,
  });
}

/**
 * The CSV export's URL, for an ordinary link.
 *
 * A link rather than a fetch on purpose: the response is an attachment, and
 * letting the browser handle the download gives a real filename and progress
 * without holding the file in memory first.
 */
export function usageCsvUrl(windowDays: number): string {
  const url = new URL(`${config.portalApiUrl.replace(/\/+$/, '')}/me/usage.csv`);
  url.searchParams.set('window', String(windowDays));
  return url.toString();
}

// --------------------------------------------------------------- top-ups

export interface TopUpOptions {
  /** Currencies a payment can actually be settled in - shorter than the list
   *  we can quote a balance in. */
  payableCurrencies: string[];
  /** How the payer can send money. Bank transfer first - it's the accessible
   *  option for most users, who have a bank account and no stablecoin. */
  methods: PaymentMethod[];
  /**
   * The floor per method - they genuinely differ. Stablecoin has a hard
   * provider floor of ~$1.45; bank transfer has none, so Rovie's own policy
   * minimum applies. Show the one for the selected method.
   */
  minUsdByMethod: Record<PaymentMethod, number>;
  /**
   * The same limits expressed in each payable currency, in minor units,
   * converted server-side. Preferred over the USD figures for display: a
   * currency may be missing here if its rate was briefly unavailable, in
   * which case fall back to USD rather than printing a wrong number.
   */
  limits: Record<
    string,
    { minMinorByMethod: Record<PaymentMethod, number>; maxMinor: number }
  >;
  /** Rovie's own minimum, before any provider floor. */
  policyMinUsd: number;
  maxUsd: number;
}

export function getTopUpOptions(signal?: AbortSignal): Promise<TopUpOptions> {
  return portalCall<TopUpOptions>('/me/top-up/options', { signal });
}

export interface TopUpQuote {
  currency: string;
  amountMinor: number;
  /** Credit that would be added, after Rovie's markup. */
  creditUsd: number;
  markupPercent: number;
  method: PaymentMethod;
  /** Always true: rates move, and the binding rate is the one locked when
   *  the charge is created. */
  indicative: boolean;
}

export function quoteTopUp(input: {
  currency: string;
  amountMinor: number;
  method: PaymentMethod;
}): Promise<TopUpQuote> {
  return portalCall<TopUpQuote>('/me/top-up/quote', { method: 'POST', body: input });
}

/** How the payer sends the money, not how Rovie is settled. */
export type PaymentMethod = 'bank' | 'crypto';

export interface TopUpCharge {
  /** IvoryPay's hosted checkout. Send the browser here. */
  checkoutUrl: string;
  reference: string;
  creditUsd: number;
  method: PaymentMethod;
  /** What the payer is asked for, including the provider's fee. */
  amountInFiat?: number;
  platformFeeInFiat?: number;
}

export function startTopUp(input: {
  currency: string;
  amountMinor: number;
  method: PaymentMethod;
}): Promise<TopUpCharge> {
  return portalCall<TopUpCharge>('/me/top-up', { method: 'POST', body: input });
}

export interface PaymentRefresh {
  status: string;
  /** True when this check actually settled the payment. */
  changed: boolean;
  addedUsd?: number;
  /** The provider has no record of anyone paying yet. */
  awaitingPayment?: boolean;
}

/**
 * Asks the provider what happened to a pending payment.
 *
 * Needed because webhooks require a publicly reachable URL - locally none
 * arrives at all, so without this a real, completed payment shows as
 * "Waiting for payment" forever.
 */
export function refreshPayment(paymentId: string): Promise<PaymentRefresh> {
  return portalCall<PaymentRefresh>(`/me/payments/${encodeURIComponent(paymentId)}/refresh`, {
    method: 'POST',
    body: {},
  });
}

// ------------------------------------------------------- account deletion

export interface DeletionPreview {
  availableUsd: number;
  /** False when the balance could not be read. The warning must not imply
   *  there is nothing to lose in that case. */
  balanceKnown: boolean;
  activeKeys: number;
  paymentCount: number;
  /** True when the account has paid before, so an anonymised row is kept to
   *  hold the payment ledger's reference. */
  retainsLedger: boolean;
}

export function getDeletionPreview(signal?: AbortSignal): Promise<DeletionPreview> {
  return portalCall<DeletionPreview>('/me/deletion-preview', { signal });
}

/**
 * Deletes the account. `confirmForfeitUsd` must match the balance the user
 * was shown, so unspent credit can never be destroyed by a generic
 * "are you sure".
 */
export function deleteAccount(confirmForfeitUsd: number): Promise<{ deleted: boolean; ledgerRetained: boolean }> {
  return portalCall<{ deleted: boolean; ledgerRetained: boolean }>('/me', {
    method: 'DELETE',
    body: { confirmForfeitUsd },
  });
}
