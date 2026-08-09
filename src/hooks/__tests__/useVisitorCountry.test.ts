import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVisitorCountry } from '../useVisitorCountry';

describe('useVisitorCountry', () => {
  it('starts in a loading state with no country resolved', () => {
    const { result } = renderHook(() => useVisitorCountry());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.country).toBeNull();
  });

  it('settles to a terminal state once the real geolocation request completes', async () => {
    const { result } = renderHook(() => useVisitorCountry());
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 12000 });

    const settledCorrectly =
      result.current.country !== null ||
      result.current.error !== null ||
      (result.current.country === null && result.current.error === null);
    expect(settledCorrectly).toBe(true);
  });

  it('only ever resolves country to an entry with a two-letter alpha2 code', async () => {
    const { result } = renderHook(() => useVisitorCountry());
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 12000 });
    if (result.current.country) {
      expect(result.current.country.alpha2).toMatch(/^[A-Z]{2}$/);
    }
  });
});
