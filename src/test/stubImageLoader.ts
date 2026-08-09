import { vi } from 'vitest';

/**
 * Stands in for the browser's image loader.
 *
 * jsdom never fetches an `<img>`, so neither `onload` nor `onerror` ever fires
 * and the docs probe in `useServiceHealth` sits there until its own 8-second
 * timeout - in every test that renders a page reading service health.
 *
 * Deliberately NOT in test/setup.ts. That file carries environment polyfills
 * that fake no app behaviour; a globally-installed loader that always succeeded
 * would quietly assert "the documentation site is up" in every test on the
 * suite, including ones written to check the opposite. Tests opt in, and say
 * which outcome they are testing.
 *
 * Call `vi.unstubAllGlobals()` in afterEach, as the callers do.
 */
export function stubImageLoader(outcome: 'load' | 'error'): { requested: string[] } {
  const requested: string[] = [];

  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    #src = '';

    get src(): string {
      return this.#src;
    }

    set src(value: string) {
      this.#src = value;
      // The probe assigns '' to cancel an in-flight request. That is a
      // cancellation, not a load, and must not settle the promise.
      if (!value) return;

      requested.push(value);
      // A microtask rather than synchronous: a real load is always async, and
      // firing inside the assignment would let a handler attached on the next
      // line miss the event entirely.
      queueMicrotask(() => {
        if (outcome === 'load') this.onload?.();
        else this.onerror?.();
      });
    }
  }

  vi.stubGlobal('Image', FakeImage);
  return { requested };
}
