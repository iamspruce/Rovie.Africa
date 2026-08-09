import { useCallback, useEffect, useState } from 'react';
import { rovie } from '../sdk';
import { isAbortError } from '../sdk/httpClient';
import type { UsageSnapshot } from '../sdk/portalService';

/**
 * The signed-in user's own usage over a window.
 *
 * `data` is held across a window change rather than cleared, the same way the
 * public rankings page does it: switching 7d -> 90d dims the previous slice
 * instead of collapsing the layout and bouncing the reader up the page.
 */
export function useUsage(windowDays: number) {
  const [data, setData] = useState<UsageSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (days: number, signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const snapshot = await rovie.portal.getUsage(days, signal);
      setData(snapshot);
      setError(null);
    } catch (err) {
      if (isAbortError(err)) return;
      setError('Could not load your usage. Refresh to try again.');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(windowDays, controller.signal);
    return () => controller.abort();
  }, [load, windowDays]);

  return {
    data,
    error,
    isLoading,
    /** True only before there's anything to hold on screen. */
    isInitialLoad: isLoading && data === null,
    reload: () => load(windowDays),
  };
}
