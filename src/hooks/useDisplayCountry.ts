import { useCallback, useState } from 'react';
import { useVisitorCountry } from './useVisitorCountry';
import { currencyForAlpha2, findByAlpha2 } from '../lib/d3/africaCountries';
import type { AfricanCountry } from '../lib/d3/africaCountries';

/**
 * Which country's currency we quote prices in: what the visitor chose, or
 * where we detected them, in that order.
 *
 * Deliberately separate from `useVisitorCountry`, which answers "where is
 * this person" and must keep answering it honestly - if you pick Kenya from
 * Lagos, detection still says NG. This hook answers the different question
 * of "which currency should this page print", and only that is overridable.
 *
 * The choice is persisted, so someone who corrected a bad IP lookup isn't
 * made to correct it again on their next visit.
 */
const STORAGE_KEY = 'rovie_display_country';

function readStoredOverride(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Only honour a country we can actually name, so a stale or hand-edited
    // value falls back to detection instead of blanking the price column.
    return raw && findByAlpha2(raw) ? raw.toUpperCase() : null;
  } catch {
    return null;
  }
}

function writeStoredOverride(alpha2: string | null) {
  try {
    if (alpha2) window.localStorage.setItem(STORAGE_KEY, alpha2);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (private mode, blocked storage) - the choice
    // still applies for this session, it just won't outlive the tab.
  }
}

export interface DisplayCountry {
  /** The country we're pricing in, or null when we know neither. */
  country: AfricanCountry | null;
  alpha2: string | null;
  /** ISO 4217 code, or undefined when we have no country to derive one from. */
  currency: string | undefined;
  /** True when this came from the IP lookup rather than the visitor's own choice. */
  isDetected: boolean;
  detectedCountry: AfricanCountry | null;
  /** Detection is still in flight AND the visitor hasn't overridden it. */
  isLoading: boolean;
  selectCountry: (alpha2: string | null) => void;
  useDetectedCountry: () => void;
}

export function useDisplayCountry(): DisplayCountry {
  const { country: detectedCountry, isLoading } = useVisitorCountry();
  const [override, setOverride] = useState<string | null>(readStoredOverride);

  const selectCountry = useCallback((alpha2: string | null) => {
    const next = alpha2 ? alpha2.toUpperCase() : null;
    setOverride(next);
    writeStoredOverride(next);
  }, []);

  const useDetectedCountry = useCallback(() => selectCountry(null), [selectCountry]);

  const alpha2 = override ?? detectedCountry?.alpha2 ?? null;

  return {
    country: alpha2 ? (findByAlpha2(alpha2) ?? null) : null,
    alpha2,
    currency: currencyForAlpha2(alpha2 ?? undefined),
    isDetected: override === null && detectedCountry !== null,
    detectedCountry: detectedCountry ?? null,
    isLoading: isLoading && override === null,
    selectCountry,
    useDetectedCountry,
  };
}
