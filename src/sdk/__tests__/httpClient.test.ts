import { describe, it, expect } from 'vitest';
import { buildUrl, buildHeaders, RovieApiError } from '../httpClient';

describe('buildUrl', () => {
  it('joins a base URL and a path with a single slash', () => {
    expect(buildUrl('http://localhost:4001', '/users')).toBe(
      'http://localhost:4001/users'
    );
  });

  it('handles a base URL with a trailing slash', () => {
    expect(buildUrl('http://localhost:4001/', 'users')).toBe(
      'http://localhost:4001/users'
    );
  });

  it('handles a path without a leading slash', () => {
    expect(buildUrl('http://localhost:4001', 'users')).toBe(
      'http://localhost:4001/users'
    );
  });

  it('appends query params', () => {
    const url = buildUrl('http://localhost:4001', '/keys/sk-rovie-xxxx/balance', {
      currency: 'NGN',
    });
    expect(url).toBe('http://localhost:4001/keys/sk-rovie-xxxx/balance?currency=NGN');
  });

  it('omits empty, null, or undefined query params', () => {
    const url = buildUrl('http://localhost:4001', '/models', {
      a: undefined as unknown as string,
      b: null as unknown as string,
      c: '' as unknown as string,
      d: 'kept',
    });
    expect(url).toBe('http://localhost:4001/models?d=kept');
  });

  it('preserves path segments like userId in the middle of the path', () => {
    const url = buildUrl(
      'http://localhost:4001',
      '/users/a1b2c3d4/client-config/opencode'
    );
    expect(url).toBe('http://localhost:4001/users/a1b2c3d4/client-config/opencode');
  });

  it('throws when baseUrl is missing', () => {
    expect(() => buildUrl(undefined as unknown as string, '/users')).toThrow();
  });
});

describe('buildHeaders', () => {
  it('defaults to a JSON content type header only', () => {
    expect(buildHeaders()).toEqual({ 'Content-Type': 'application/json' });
  });

  it('adds an Authorization bearer header for a user apiKey', () => {
    expect(buildHeaders({ apiKey: 'sk-rovie-xxxx' })).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer sk-rovie-xxxx',
    });
  });

  it('adds an x-api-key header for an internal key', () => {
    expect(buildHeaders({ internalKey: 'internal-secret' })).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': 'internal-secret',
    });
  });

  it('omits the content-type header when json is false', () => {
    expect(buildHeaders({ json: false })).toEqual({});
  });

  it('can combine an apiKey and internalKey', () => {
    expect(buildHeaders({ apiKey: 'a', internalKey: 'b' })).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer a',
      'x-api-key': 'b',
    });
  });
});

describe('RovieApiError', () => {
  it('carries status, body and url', () => {
    const err = new RovieApiError('boom', { status: 404, body: { a: 1 }, url: 'x' });
    expect(err.message).toBe('boom');
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ a: 1 });
    expect(err.url).toBe('x');
    expect(err.name).toBe('RovieApiError');
  });
});
