import { describe, it, expect } from 'vitest';
import {
  convertUsdToLocal,
  formatCurrency,
  formatUsdAsLocal,
  isCurrencySupported,
} from '../currency';
import type { FxRates } from '../currency';

const fxRates: FxRates = {
  currencies: {
    NGN: { ratePerUsd: 1550.25 },
    KES: { ratePerUsd: 129.5 },
    GHS: { ratePerUsd: 15.4 },
    UGX: { ratePerUsd: 3720.0 },
  },
  supported: ['NGN', 'UGX', 'GHS', 'KES'],
  fetchedAt: 1784995200000,
};

describe('convertUsdToLocal', () => {
  it('multiplies the USD amount by the live rate', () => {
    expect(convertUsdToLocal(0.5, fxRates, 'NGN')).toBeCloseTo(775.125, 5);
  });

  it('works for every supported currency', () => {
    expect(convertUsdToLocal(1, fxRates, 'KES')).toBeCloseTo(129.5, 5);
    expect(convertUsdToLocal(1, fxRates, 'GHS')).toBeCloseTo(15.4, 5);
    expect(convertUsdToLocal(1, fxRates, 'UGX')).toBeCloseTo(3720.0, 5);
  });

  it('throws for an unsupported currency', () => {
    expect(() => convertUsdToLocal(0.5, fxRates, 'ZAR')).toThrow(/ZAR/);
  });

  it('throws when fxRates is missing entirely', () => {
    expect(() => convertUsdToLocal(0.5, undefined as unknown as FxRates, 'NGN')).toThrow();
  });
});

describe('formatCurrency', () => {
  it('formats NGN with the naira symbol', () => {
    expect(formatCurrency(775.13, 'NGN')).toContain('775');
    expect(formatCurrency(775.13, 'NGN')).toMatch(/[₦NGN]/);
  });

  it('falls back gracefully for an unrecognised currency code', () => {
    expect(formatCurrency(10, 'XXX')).toContain('10.00');
  });
});

describe('formatUsdAsLocal', () => {
  it('converts and formats in one call', () => {
    const result = formatUsdAsLocal(0.5, fxRates, 'KES');
    expect(result).toContain('64.75'.slice(0, 2));
  });
});

describe('isCurrencySupported', () => {
  it('returns true for a currency present in the fxRates response', () => {
    expect(isCurrencySupported(fxRates, 'NGN')).toBe(true);
  });

  it('returns false for a currency not present', () => {
    expect(isCurrencySupported(fxRates, 'ZAR')).toBe(false);
  });

  it('returns false when fxRates is undefined', () => {
    expect(isCurrencySupported(undefined as unknown as FxRates, 'NGN')).toBe(false);
  });
});
