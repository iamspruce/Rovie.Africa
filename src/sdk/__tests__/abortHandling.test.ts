import { describe, it, expect } from 'vitest';
import { isAbortError, request, RovieApiError } from '../httpClient';

/**
 * Regression cover for a shipped bug.
 *
 * `request()` used to wrap EVERY fetch rejection in a RovieApiError, including
 * a caller-initiated abort. That made `err.name` always 'RovieApiError', so
 * callers guarding on 'AbortError' never matched - and because React's
 * StrictMode mounts effects twice and aborts the first request, every page
 * load in development rendered a "can't reach the server" error on a
 * perfectly healthy backend.
 */
describe('request() abort handling', () => {
  it('rethrows a caller-initiated abort as an AbortError, not a RovieApiError', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      request('http://localhost:9/never-reached', { signal: controller.signal })
    ).rejects.toSatisfy(
      (err: unknown) => isAbortError(err) && !(err instanceof RovieApiError),
      'an AbortError that is not a RovieApiError'
    );
  });

  it('recognises an abort that happens after the request is in flight', async () => {
    const controller = new AbortController();
    const pending = request('http://localhost:9/never-reached', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toSatisfy(isAbortError, 'an AbortError');
  });

  it('still reports a genuine network failure as a RovieApiError', async () => {
    // Port 9 (discard) with no listener: a real connection failure, and one
    // the user should be told about rather than have swallowed as an abort.
    await expect(request('http://localhost:9/nothing-here', { timeoutMs: 2000 })).rejects.toSatisfy(
      (err: unknown) => err instanceof RovieApiError && !isAbortError(err),
      'a RovieApiError that is not an AbortError'
    );
  });

  it('does not treat arbitrary errors as aborts', () => {
    expect(isAbortError(new Error('boom'))).toBe(false);
    expect(isAbortError(new RovieApiError('failed', { status: 500 }))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError({ name: 'AbortError' })).toBe(false); // not an Error instance
  });
});
