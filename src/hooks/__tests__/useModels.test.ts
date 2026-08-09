import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useModels } from '../useModels';

describe('useModels', () => {
  it('starts in a loading state with no data', () => {
    const { result } = renderHook(() => useModels());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('settles to a terminal state once the real request completes', async () => {
    const { result } = renderHook(() => useModels());
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 12000 });
    const settledCorrectly =
      (result.current.data !== null && result.current.error === null) ||
      (result.current.data === null && result.current.error !== null);
    expect(settledCorrectly).toBe(true);
  });
});
