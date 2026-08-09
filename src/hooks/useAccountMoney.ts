import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFxRates } from './useFxRates';
import { currencyForAlpha2 } from '../lib/d3/africaCountries';
import { formatLocalOrUsd } from '../lib/pricing';

/**
 * Formats a USD figure in the currency this ACCOUNT is billed in.
 *
 * Deliberately not `useDisplayCountry`, which the marketing pages use: that
 * one follows a picker anyone can change to browse prices elsewhere. Money
 * that has been spent or is owed has exactly one correct currency - the one
 * the account was funded in - and letting a picker restate it would make the
 * dashboard disagree with the balance and the receipts.
 *
 * Falls back to dollars when the account's currency has no rate, which is
 * the same fallback the balance endpoint makes server-side.
 */
export function useAccountMoney() {
  const { user } = useAuth();
  const { data: fxRates } = useFxRates();
  const currency = currencyForAlpha2(user?.country) ?? undefined;

  const money = useCallback(
    (usd: number) => formatLocalOrUsd(usd, fxRates, currency).text,
    [fxRates, currency]
  );

  return { money, currency, hasLocalRate: formatLocalOrUsd(1, fxRates, currency).isLocal };
}
