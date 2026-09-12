import { apiCall } from './httpClient';
import { config } from './config';

export interface RegisterUserPayload {
  email?: string;
  phone?: string;
  country: string;
}

export interface GetFxRatesOptions {
  signal?: AbortSignal;
}

export interface GetModelsOptions {
  signal?: AbortSignal;
}

export interface IssueApiKeyPayload {
  label?: string;
}

export function registerUser({ email, phone, country }: RegisterUserPayload): Promise<unknown> {
  if (!country) throw new Error('registerUser: "country" is required');
  if (!email && !phone) {
    throw new Error('registerUser: at least one of "email" or "phone" is required');
  }
  return apiCall({
    baseUrl: config.accountServiceUrl,
    path: '/users',
    method: 'POST',
    body: { email, phone, country },
  });
}

export function getBalance(key: string, currency: string = 'NGN'): Promise<unknown> {
  if (!key) throw new Error('getBalance: "key" is required');
  return apiCall({
    baseUrl: config.accountServiceUrl,
    path: `/keys/${encodeURIComponent(key)}/balance`,
    query: { currency },
  });
}

export function getFxRates({ signal }: GetFxRatesOptions = {}): Promise<unknown> {
  return apiCall({
    baseUrl: config.accountServiceUrl,
    path: '/fx/rates',
    signal,
  });
}

export interface GetRankingsOptions {
  /** 7, 30 or 90. Anything else is coerced to 30 by account-service. */
  windowDays?: number;
  signal?: AbortSignal;
}

/**
 * Aggregate usage stats behind the public rankings page. Everything it
 * returns is summed across all users over the window - there's no per-user
 * shape here to leak.
 */
export function getRankings({ windowDays = 30, signal }: GetRankingsOptions = {}): Promise<unknown> {
  return apiCall({
    baseUrl: config.accountServiceUrl,
    path: '/stats/rankings',
    query: { window: String(windowDays) },
    signal,
  });
}

export function getModels({ signal }: GetModelsOptions = {}): Promise<unknown> {
  return apiCall({
    baseUrl: config.accountServiceUrl,
    path: '/models',
    signal,
    // The homepage labels this a live catalog. Do not let a browser reuse an
    // older response when a provider adds, retires, or reprices a model.
    cache: 'no-store',
  });
}

export function issueApiKey(userId: string, { label }: IssueApiKeyPayload = {}): Promise<unknown> {
  if (!userId) throw new Error('issueApiKey: "userId" is required');
  return apiCall({
    baseUrl: config.accountServiceUrl,
    path: `/users/${encodeURIComponent(userId)}/api-keys`,
    method: 'POST',
    body: { label },
  });
}

export function getClientConfig(userId: string, client: string = 'generic'): Promise<unknown> {
  if (!userId) throw new Error('getClientConfig: "userId" is required');
  return apiCall({
    baseUrl: config.accountServiceUrl,
    path: `/users/${encodeURIComponent(userId)}/client-config/${encodeURIComponent(client)}`,
  });
}
