export interface RovieApiErrorOptions {
  status?: number;
  body?: unknown;
  url?: string;
}

export class RovieApiError extends Error {
  status: number | undefined;
  body: unknown;
  url: string | undefined;

  constructor(message: string, { status, body, url }: RovieApiErrorOptions = {}) {
    super(message);
    this.name = 'RovieApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

/**
 * Was this rejection a cancelled request rather than a failed one?
 *
 * Worth a helper rather than `err.name === 'AbortError'` at each call site:
 * an abort can surface as a DOMException, and a caller that gets the check
 * subtly wrong shows the user an error for a request that was deliberately
 * thrown away - which is exactly what React's StrictMode double-mount
 * produces on every page load in development.
 */
export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export interface BuildHeadersOptions {
  apiKey?: string;
  internalKey?: string;
  json?: boolean;
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * 'include' sends the portal-api session cookie. Needed by everything under
   * src/sdk/portalService.ts and by nothing else - the other services
   * authenticate with a bearer key, and sending credentials to them would
   * attach a cookie to requests that have no use for one.
   */
  credentials?: RequestCredentials;
}

export interface ApiCallOptions {
  baseUrl: string;
  path: string;
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
  apiKey?: string;
  internalKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  credentials?: RequestCredentials;
}

export function buildUrl(baseUrl: string, path: string, query: Record<string, string> = {}): string {
  if (!baseUrl) throw new Error('buildUrl: baseUrl is required');
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const trimmedPath = String(path).replace(/^\/+/, '');
  const url = new URL(`${trimmedBase}/${trimmedPath}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export function buildHeaders({ apiKey, internalKey, json = true }: BuildHeadersOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (internalKey) headers['x-api-key'] = internalKey;
  return headers;
}

const DEFAULT_TIMEOUT_MS = 8000;

export async function request(
  url: string,
  { method = 'GET', headers = {}, body, signal, timeoutMs = DEFAULT_TIMEOUT_MS, credentials }: RequestOptions = {}
): Promise<unknown> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: combinedSignal,
      credentials,
    });
  } catch (networkError: unknown) {
    // A caller-initiated abort is not a failure and must stay recognisable as
    // an abort. Wrapping it made every rejection arrive as a RovieApiError,
    // so callers guarding on `err.name === 'AbortError'` never matched - and
    // under React's StrictMode, which mounts effects twice and aborts the
    // first request, that turned an ordinary double-mount into a visible
    // "can't reach the server" error on a perfectly healthy page.
    //
    // Only the caller's own signal counts. A timeout is a real failure the
    // user should be told about, so it still gets wrapped below.
    if (signal?.aborted) throw networkError;

    throw new RovieApiError(
      `Network request to ${url} failed: ${(networkError as Error).message}`,
      { url }
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    throw new RovieApiError(
      `Request to ${url} failed with status ${response.status}`,
      { status: response.status, body: data, url }
    );
  }

  return data;
}

export async function apiCall({
  baseUrl,
  path,
  method = 'GET',
  query,
  body,
  apiKey,
  internalKey,
  signal,
  timeoutMs,
  credentials,
}: ApiCallOptions): Promise<unknown> {
  const url = buildUrl(baseUrl, path, query);
  const headers = buildHeaders({ apiKey, internalKey, json: body !== undefined });
  return request(url, { method, headers, body, signal, timeoutMs, credentials });
}
