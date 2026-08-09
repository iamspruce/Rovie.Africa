import { useEffect, useState } from 'react';
import { rovie } from '../sdk';
import { findByAlpha2, ALPHA2_TO_CURRENCY } from '../lib/d3/africaCountries';
import type { AfricanCountry } from '../lib/d3/africaCountries';

interface CachedGeo {
  countryCode: string;
  countryName: string;
  timestamp: number;
}

const STORAGE_KEY = 'rovie_visitor_geo';

function writeCache(countryCode: string, countryName: string) {
  const entry: CachedGeo = { countryCode, countryName, timestamp: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage unavailable
  }
}

function readCache(): CachedGeo | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedGeo;
  } catch {
    return null;
  }
}

export function useVisitorCountry() {
  const [country, setCountry] = useState<AfricanCountry | null>(() => {
    const cached = readCache();
    if (cached) {
      const resolved = findByAlpha2(cached.countryCode);
      return resolved || null;
    }
    return null;
  });
  const [rawCountryName, setRawCountryName] = useState<string | null>(() => {
    const cached = readCache();
    return cached ? cached.countryName : null;
  });
  const [isLoading, setIsLoading] = useState(() => !readCache());
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { countryCode, countryName } = await rovie.geo.detectVisitorCountry();
        if (cancelled) return;

        const cached = readCache();
        const hasChanged = !cached || cached.countryCode !== countryCode;

        if (hasChanged) {
          writeCache(countryCode, countryName);
        }

        setRawCountryName(countryName);
        setCountry(findByAlpha2(countryCode) || null);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const currency = country ? ALPHA2_TO_CURRENCY[country.alpha2] : undefined;

  return { country, rawCountryName, currency, isLoading, error };
}
