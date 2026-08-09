import { describe, it, expect } from 'vitest';
import {
  AFRICA_COUNTRIES,
  AFRICA_NUMERIC_IDS,
  findByAlpha2,
  findByNumericId,
  CURRENCY_TO_ALPHA2,
  ALPHA2_TO_CURRENCY,
} from '../africaCountries';

describe('AFRICA_COUNTRIES', () => {
  it('contains 55 territories with no duplicate numeric ids', () => {
    expect(AFRICA_COUNTRIES.length).toBe(55);
    const ids = AFRICA_COUNTRIES.map((c) => c.numericId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes Nigeria, Ghana, Kenya and Uganda (the FX-supported countries)', () => {
    const alpha2s = AFRICA_COUNTRIES.map((c) => c.alpha2);
    expect(alpha2s).toEqual(
      expect.arrayContaining(['NG', 'GH', 'KE', 'UG'])
    );
  });
});

describe('findByAlpha2', () => {
  it('finds Nigeria case-insensitively', () => {
    expect(findByAlpha2('ng')?.name).toBe('Nigeria');
    expect(findByAlpha2('NG')?.name).toBe('Nigeria');
  });

  it('returns undefined for a non-African code', () => {
    expect(findByAlpha2('US')).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    expect(findByAlpha2(undefined as unknown as string)).toBeUndefined();
  });
});

describe('findByNumericId', () => {
  it('finds Nigeria by its ISO numeric id', () => {
    expect(findByNumericId('566')?.alpha2).toBe('NG');
  });

  it('coerces non-string ids', () => {
    expect(findByNumericId(566)?.alpha2).toBe('NG');
  });
});

describe('AFRICA_NUMERIC_IDS', () => {
  it('is a Set containing every country numeric id', () => {
    expect(AFRICA_NUMERIC_IDS.has('566')).toBe(true);
    expect(AFRICA_NUMERIC_IDS.has('840')).toBe(false);
  });
});

describe('currency <-> alpha2 maps', () => {
  it('map exactly the four FX-supported currencies', () => {
    expect(CURRENCY_TO_ALPHA2).toEqual({
      NGN: 'NG',
      GHS: 'GH',
      KES: 'KE',
      UGX: 'UG',
    });
  });

  it('are exact inverses of one another', () => {
    Object.entries(CURRENCY_TO_ALPHA2).forEach(([currency, alpha2]) => {
      expect(ALPHA2_TO_CURRENCY[alpha2]).toBe(currency);
    });
  });
});
