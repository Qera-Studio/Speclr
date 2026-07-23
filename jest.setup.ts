import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// IntersectionObserver — not implemented in jsdom
// Stub so components using IntersectionObserver don't throw in tests.
// ---------------------------------------------------------------------------

class IntersectionObserverStub {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  constructor(public callback: IntersectionObserverCallback) {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverStub,
});

// ---------------------------------------------------------------------------
// ResizeObserver — not implemented in jsdom (the Paginator relies on it)
// ---------------------------------------------------------------------------

class ResizeObserverStub {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  constructor(public callback: ResizeObserverCallback) {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverStub,
});

// ---------------------------------------------------------------------------
// window.matchMedia — not implemented in jsdom
// Default: prefers-reduced-motion OFF (standard user)
// ---------------------------------------------------------------------------

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

// ---------------------------------------------------------------------------
// HTMLMediaElement — jsdom has no media engine; mock play/pause so tests
// that render <video> do not throw unhandled promise rejections.
// ---------------------------------------------------------------------------

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: jest.fn(),
});
