import { useEffect, useState, useCallback } from 'react';
import { rovie } from '../sdk';

export function useFxRates() {
  const [data, setData] = useState<{ currencies: Record<string, { ratePerUsd: number }>; supported: string[]; fetchedAt: number } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await rovie.account.getFxRates({ signal });
      if (!signal?.aborted) setData(result as typeof data);
    } catch (err) {
      if (!signal?.aborted) setError(err as Error);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { data, error, isLoading, refetch: load };
}
