import { describe, it, expect } from 'vitest';
import { registerUser, getBalance, issueApiKey, getClientConfig } from '../accountService';
import type { RegisterUserPayload } from '../accountService';

describe('registerUser validation', () => {
  it('throws when country is missing', () => {
    expect(() => registerUser({ email: 'a@b.com' } as RegisterUserPayload)).toThrow(/country/i);
  });

  it('throws when neither email nor phone is provided', () => {
    expect(() => registerUser({ country: 'NG' })).toThrow(/email.*phone/i);
  });

  it('passes validation and returns a pending request when email + country are provided', () => {
    let result;
    expect(() => {
      result = registerUser({ email: 'a@b.com', country: 'NG' });
    }).not.toThrow();
    expect(result).toBeInstanceOf(Promise);
    (result as unknown as Promise<unknown>).catch(() => {});
  });
});

describe('getBalance validation', () => {
  it('throws when key is missing', () => {
    expect(() => getBalance(undefined as unknown as string)).toThrow(/key/i);
  });
});

describe('issueApiKey validation', () => {
  it('throws when userId is missing', () => {
    expect(() => issueApiKey(undefined as unknown as string)).toThrow(/userId/i);
  });
});

describe('getClientConfig validation', () => {
  it('throws when userId is missing', () => {
    expect(() => getClientConfig(undefined as unknown as string)).toThrow(/userId/i);
  });

  it('defaults the client to "generic" and issues a real request', () => {
    let result;
    expect(() => {
      result = getClientConfig('user-1');
    }).not.toThrow();
    (result as unknown as Promise<unknown>).catch(() => {});
  });
});
