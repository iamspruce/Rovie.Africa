import { describe, it, expect } from 'vitest';
import { messageForAuthError } from '../authErrors';
import { RovieApiError } from '../../sdk/httpClient';

describe('messageForAuthError', () => {
  it('maps a known Better Auth code to actionable wording', () => {
    const err = new RovieApiError('failed', {
      status: 401,
      body: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
    });
    expect(messageForAuthError(err)).toBe('That email and password don’t match an account.');
  });

  it('tells a user with a short password exactly what is required', () => {
    const err = new RovieApiError('failed', {
      status: 400,
      body: { code: 'PASSWORD_TOO_SHORT', message: 'Password too short' },
    });
    expect(messageForAuthError(err)).toBe('Use at least 12 characters.');
  });

  it("falls back to the server's own message for codes it doesn't know", () => {
    const err = new RovieApiError('failed', {
      status: 400,
      body: { code: 'SOME_NEW_CODE', message: 'Something specific happened' },
    });
    expect(messageForAuthError(err)).toBe('Something specific happened');
  });

  it('names rate limiting when there is no body to read', () => {
    const err = new RovieApiError('failed', { status: 429, body: null });
    expect(messageForAuthError(err)).toBe('Too many attempts. Wait a minute and try again.');
  });

  it('distinguishes an unreachable service from a rejected request', () => {
    // A RovieApiError with no status is what httpClient throws when fetch
    // itself failed - a down portal-api, not a refused sign-in.
    const err = new RovieApiError('Network request failed', { url: 'http://localhost:4002/auth' });
    expect(messageForAuthError(err)).toBe(
      'Can’t reach Rovie right now. Check your connection and try again.'
    );
  });

  it('does not leak whether an account exists', () => {
    // portal-api answers both "no such user" and "wrong password" with the
    // same code; the mapping must not invent a distinction the server
    // deliberately withholds.
    const err = new RovieApiError('failed', {
      status: 401,
      body: { code: 'INVALID_EMAIL_OR_PASSWORD' },
    });
    const message = messageForAuthError(err);
    expect(message).not.toMatch(/no account|not found|unknown|doesn’t exist/i);
  });

  it('handles a non-API error', () => {
    expect(messageForAuthError(new Error('boom'))).toBe('Something went wrong. Try again.');
  });
});
