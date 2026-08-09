import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const useVisitorCountry = vi.fn();
vi.mock('../useVisitorCountry', () => ({
  useVisitorCountry: () => useVisitorCountry(),
}));

import { useDisplayCountry } from '../useDisplayCountry';

const NIGERIA = { numericId: '566', alpha2: 'NG', alpha3: 'NGA', name: 'Nigeria' };

function detected(country: typeof NIGERIA | null, isLoading = false) {
  useVisitorCountry.mockReturnValue({ country, isLoading });
}

/**
 * Node 26 ships its own `localStorage` global that stays unavailable without
 * --localstorage-file, and it shadows the one jsdom provides - so a test that
 * wants to assert on persistence has to bring its own. The hook itself only
 * ever touches storage inside a try/catch, which is why it degrades quietly
 * in that environment rather than throwing.
 */
function installMemoryStorage() {
  let store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    },
  });
}

describe('useDisplayCountry', () => {
  beforeEach(() => {
    installMemoryStorage();
    detected(NIGERIA);
  });

  it('falls back to the detected country and derives its currency', () => {
    const { result } = renderHook(() => useDisplayCountry());
    expect(result.current.alpha2).toBe('NG');
    expect(result.current.currency).toBe('NGN');
    expect(result.current.isDetected).toBe(true);
  });

  it('knows nothing rather than guessing when detection returns nothing', () => {
    detected(null);
    const { result } = renderHook(() => useDisplayCountry());
    expect(result.current.alpha2).toBeNull();
    expect(result.current.currency).toBeUndefined();
    expect(result.current.isDetected).toBe(false);
  });

  it('lets a visitor override detection, and stops calling it detected', () => {
    const { result } = renderHook(() => useDisplayCountry());
    act(() => result.current.selectCountry('KE'));

    expect(result.current.alpha2).toBe('KE');
    expect(result.current.currency).toBe('KES');
    expect(result.current.isDetected).toBe(false);
    // Detection still reports where they actually are - the override only
    // changes which currency we print.
    expect(result.current.detectedCountry?.alpha2).toBe('NG');
  });

  it('persists the override across mounts', () => {
    const first = renderHook(() => useDisplayCountry());
    act(() => first.result.current.selectCountry('gh'));

    const second = renderHook(() => useDisplayCountry());
    expect(second.result.current.alpha2).toBe('GH');
    expect(second.result.current.currency).toBe('GHS');
  });

  it('reverts to detection when the override is cleared', () => {
    const { result } = renderHook(() => useDisplayCountry());
    act(() => result.current.selectCountry('KE'));
    act(() => result.current.useDetectedCountry());

    expect(result.current.alpha2).toBe('NG');
    expect(result.current.isDetected).toBe(true);
    expect(window.localStorage.getItem('rovie_display_country')).toBeNull();
  });

  it('ignores a stored country it cannot resolve', () => {
    window.localStorage.setItem('rovie_display_country', 'XX');
    const { result } = renderHook(() => useDisplayCountry());
    expect(result.current.alpha2).toBe('NG');
  });

  it('is not loading while an override is in force, even mid-detection', () => {
    detected(null, true);
    window.localStorage.setItem('rovie_display_country', 'KE');
    const { result } = renderHook(() => useDisplayCountry());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.alpha2).toBe('KE');
  });
});
