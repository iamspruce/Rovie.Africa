import { describe, it, expect } from 'vitest';
import { RovieApiError } from '../../sdk';
import { classifyFailure, couldBeLocal, MalformedResponseError } from '../statusFailures';

describe('classifyFailure', () => {
  it('calls a 5xx ours', () => {
    const failure = classifyFailure(new RovieApiError('boom', { status: 503 }));
    expect(failure.kind).toBe('server');
    // The point of the classification: a service that answered with an error
    // is provably not the visitor's network, and the page must not suggest it.
    expect(failure.couldBeLocal).toBe(false);
  });

  it('calls a 4xx a rejection, and allows that something in between did it', () => {
    const failure = classifyFailure(new RovieApiError('nope', { status: 403 }));
    expect(failure.kind).toBe('client');
    expect(failure.couldBeLocal).toBe(true);
  });

  // A response that arrived and is unusable is the failure an uptime monitor
  // calls green. It is not: anything depending on that data is broken.
  it('separates a usable response from a useless one', () => {
    const failure = classifyFailure(new MalformedResponseError('Catalog returned no models'));
    expect(failure.kind).toBe('malformed');
    expect(failure.couldBeLocal).toBe(false);
  });

  it('recognises a timeout by DOMException name', () => {
    expect(classifyFailure(new DOMException('Timed out', 'TimeoutError')).kind).toBe('timeout');
  });

  // httpClient wraps a timeout rather than rethrowing it - a timeout is a real
  // failure, unlike a caller's own abort - so it arrives with the cause folded
  // into the message and no name to match on.
  it('recognises a timeout the SDK has already wrapped', () => {
    const wrapped = new RovieApiError('Network request to https://x failed: The operation timed out');
    expect(classifyFailure(wrapped).kind).toBe('timeout');
  });

  // The fallback, and deliberately so. DNS failure, refused connection, CORS
  // rejection and a service that is genuinely down are indistinguishable from
  // inside a browser, so the explanation says that instead of picking one.
  it('falls back to unreachable for a rejection carrying no status', () => {
    const failure = classifyFailure(new RovieApiError('Failed to fetch'));
    expect(failure.kind).toBe('unreachable');
    expect(failure.couldBeLocal).toBe(true);
  });

  it('handles something that is not an Error at all', () => {
    expect(classifyFailure('nope').kind).toBe('unreachable');
    expect(classifyFailure(undefined).kind).toBe('unreachable');
  });

  it('always returns wording for the reader, not just a kind', () => {
    const failure = classifyFailure(new RovieApiError('x', { status: 500 }));
    expect(failure.label.length).toBeGreaterThan(0);
    expect(failure.meaning.length).toBeGreaterThan(0);
    expect(failure.advice.length).toBeGreaterThan(0);
  });
});

describe('couldBeLocal', () => {
  it('is false when any failure is provably ours', () => {
    expect(couldBeLocal(['unreachable', 'server'])).toBe(false);
    expect(couldBeLocal(['unreachable', 'timeout'])).toBe(true);
  });

  it('is false with nothing to judge', () => {
    expect(couldBeLocal([])).toBe(false);
  });
});
