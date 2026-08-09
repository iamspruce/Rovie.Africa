import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const getRankings = vi.fn();
vi.mock('../../sdk', () => ({
  rovie: { account: { getRankings: (opts: unknown) => getRankings(opts) } },
}));

import { useRankings } from '../useRankings';

/** Demo mode reads the URL, so the tests drive it the way a visitor would. */
function setSearch(search: string) {
  window.history.replaceState({}, '', `/rankings${search}`);
}

describe('useRankings', () => {
  beforeEach(() => {
    getRankings.mockReset();
    setSearch('');
  });

  afterEach(() => setSearch(''));

  it('fetches the live snapshot for the requested window', async () => {
    getRankings.mockResolvedValue({ windowDays: 90, totals: { tokens: 5 } });
    const { result } = renderHook(() => useRankings(90));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getRankings).toHaveBeenCalledWith(expect.objectContaining({ windowDays: 90 }));
    expect(result.current.data?.windowDays).toBe(90);
    expect(result.current.isDemo).toBe(false);
  });

  it('surfaces a failed fetch as an error, never as substitute data', async () => {
    // The important half: a broken API must not quietly become sample data on
    // a page whose whole claim is that its figures are real.
    getRankings.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRankings(30));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
    expect(result.current.isDemo).toBe(false);
  });

  it('serves sample data instead of requesting, under ?demo=1', async () => {
    setSearch('?demo=1');
    const { result } = renderHook(() => useRankings(30));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(getRankings).not.toHaveBeenCalled();
    expect(result.current.isDemo).toBe(true);
    expect(result.current.data?.trend).toHaveLength(30);
  });

  it('lets ?demo=0 force the real endpoint back on', async () => {
    setSearch('?demo=0');
    getRankings.mockResolvedValue({ windowDays: 30 });
    const { result } = renderHook(() => useRankings(30));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getRankings).toHaveBeenCalled();
    expect(result.current.isDemo).toBe(false);
  });

  it('reports the first load separately from a refetch', async () => {
    getRankings.mockResolvedValue({ windowDays: 30 });
    const { result } = renderHook(() => useRankings(30));

    expect(result.current.isInitialLoad).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isInitialLoad).toBe(false);
  });
});
