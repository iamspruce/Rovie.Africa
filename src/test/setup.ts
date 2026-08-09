import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver. This is a plain environment
// polyfill (same idea as jsdom missing `fetch` before Node had it) - it
// doesn't fake any app behaviour or data, it just gives components that
// measure their own size (e.g. AfricaMap) something to call.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Same idea, same reason: this environment gives `window` no localStorage at
// all (Node's own is gated behind --localstorage-file, and jsdom does not fill
// it in here). The status page stores its check history there.
//
// The app already survives its absence - lib/statusHistory.ts treats a missing
// or throwing storage as "no history" rather than an error - but a test
// environment where the API simply isn't there can only ever exercise that
// fallback, and never the persistence itself. This is a plain in-memory
// implementation of the real interface; it fakes no app behaviour and no data.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();

  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(String(key)) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => void store.delete(String(key)),
    setItem: (key, value) => void store.set(String(key), String(value)),
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
  });
}

// A real browser gives each document its own storage; a test file shares one
// across every test in it. Without this, a value written by one test is read by
// the next - which is how a "country could not be detected" test started
// passing a cached country to itself and asserting the wrong copy.
//
// Defensive about the shape because two suites install their own storage stub
// over the top of this one, and neither is obliged to implement all of Storage.
afterEach(() => {
  try {
    globalThis.localStorage?.clear?.();
  } catch {
    // A stub that throws on clear is still a stub the test owns.
  }
});
