import { useCallback, useEffect, useState } from 'react';
import { rovie } from '../sdk';
import { isAbortError } from '../sdk/httpClient';
import type { UsageRequest } from '../sdk/portalService';

/**
 * The most recent requests made with this account's keys.
 *
 * `onlyFailures` is a server-side filter rather than a client-side one: the
 * reason anyone opens this is that something is erroring, and the failures
 * can easily be older than the last fifty requests.
 */
export function useRequests(options: { limit?: number; onlyFailures?: boolean } = {}) {
  const { limit = 50, onlyFailures = false } = options;
  const [data, setData] = useState<UsageRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const { requests } = await rovie.portal.listRequests({ limit, onlyFailures }, signal);
        setData(requests);
        setError(null);
      } catch (err) {
        if (isAbortError(err)) return;
        setError('Could not load recent requests. Refresh to try again.');
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [limit, onlyFailures]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { data, error, isLoading, reload: () => load() };
}
