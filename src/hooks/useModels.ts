import { useEffect, useState, useCallback } from 'react';
import { rovie } from '../sdk';

interface UseModelsData {
  models: Array<{ litellmModelName: string; provider: string; name: string; limit?: { context?: number; output?: number }; cost?: { input: number; output: number } }>;
}

export function useModels() {
  const [data, setData] = useState<UseModelsData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await rovie.account.getModels({ signal });
      if (!signal?.aborted) setData(result as UseModelsData);
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
