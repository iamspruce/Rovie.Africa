import { useCallback, useEffect, useState } from 'react';
import { rovie } from '../sdk';
import type { RankingsSnapshot } from '../lib/rankings';
import { buildMockRankings, isDemoMode } from '../lib/rankings.mock';

/**
 * Aggregate usage stats for the rankings page.
 *
 * `data` is deliberately held across a window change rather than cleared:
 * the page re-renders the previous slice at reduced opacity while the new
 * one loads, so switching 30d -> 90d doesn't collapse the layout and bounce
 * the reader down the page.
 */
export function useRankings(windowDays: number) {
  const [data, setData] = useState<RankingsSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Checked once per render rather than captured: it reads the URL, so a
  // `?demo=1` navigation should take effect without a reload.
  const isDemo = isDemoMode();

  const load = useCallback(
    async (days: number, signal?: AbortSignal) => {
      // Sample data replaces the request entirely - it is never a fallback
      // for one that failed. An outage must surface as an error, not as
      // invented usage figures on a public page.
      if (isDemoMode()) {
        setData(buildMockRankings(days));
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await rovie.account.getRankings({ windowDays: days, signal });
        if (!signal?.aborted) setData(result as RankingsSnapshot);
      } catch (err) {
        if (!signal?.aborted) setError(err as Error);
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    load(windowDays, controller.signal);
    return () => controller.abort();
  }, [load, windowDays]);

  return {
    data,
    error,
    isLoading,
    /** True only on the very first load - when there's nothing to hold on screen. */
    isInitialLoad: isLoading && data === null,
    /** The page MUST say so when this is true - the figures are invented. */
    isDemo,
    refetch: () => load(windowDays),
  };
}
