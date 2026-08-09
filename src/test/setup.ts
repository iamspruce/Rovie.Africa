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
