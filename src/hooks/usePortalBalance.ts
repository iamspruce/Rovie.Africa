import { useCallback, useEffect, useState } from 'react';
import { rovie } from '../sdk';
import { isAbortError } from '../sdk/httpClient';
import { useAuth } from '../context/AuthContext';
import { currencyForAlpha2 } from '../lib/d3/africaCountries';
import type { PortalBalance } from '../sdk/portalService';

/**
 * The signed-in user's balance, quoted in their own country's currency.
 *
 * The currency comes from the user record rather than from the display-country
 * picker the marketing pages use: a balance is money that exists, so it has to
 * be shown in the currency it was actually bought in, not whichever one the
 * visitor is browsing prices in.
 */
export function usePortalBalance() {
  const { user } = useAuth();
  const [data, setData] = useState<PortalBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currency = currencyForAlpha2(user?.country) ?? 'USD';

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const balance = await rovie.portal.getBalance(currency, signal);
        setData(balance);
        setError(null);
      } catch (err) {
        if (isAbortError(err)) return;
        setError('Could not read your balance. Refresh to try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [currency]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { data, error, isLoading, reload: load };
}
