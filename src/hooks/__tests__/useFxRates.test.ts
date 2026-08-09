import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFxRates } from '../useFxRates';

describe('useFxRates', () => {
  it('starts in a loading state with no data', () => {
    const { result } = renderHook(() => useFxRates());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('settles to a terminal state once the real request completes (success or network error)', async () => {
    const { result } = renderHook(() => useFxRates());

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 12000 });

    const settledCorrectly =
      (result.current.data !== null && result.current.error === null) ||
      (result.current.data === null && result.current.error !== null);
    expect(settledCorrectly).toBe(true);
  });

  it('exposes a refetch function', () => {
    const { result } = renderHook(() => useFxRates());
    expect(typeof result.current.refetch).toBe('function');
  });
});
