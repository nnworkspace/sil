/**
 * Setup for the component tier (ADR-0015, #198).
 *
 * jsdom is not a browser. It has no layout engine and omits several APIs the
 * components legitimately use, so the gaps are stubbed here — deliberately and
 * in one place, because each stub is a spot where the test environment can
 * drift from reality. Nothing here should grow into simulated behaviour: a stub
 * exists so a component can *mount*, not so a test can assert against it.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// React Testing Library does not auto-clean when globals are off.
afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

/** Base UI measures elements on open; jsdom has no ResizeObserver. */
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/** Used by responsive UI; jsdom implements no media queries. */
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/**
 * The photo viewer sizes itself to the *visual* viewport (#131). jsdom has no
 * `visualViewport`; the component already falls back to `window.inner*`, so it
 * is left undefined rather than faked — a fake here would assert that the
 * fallback works when it is the fake being exercised.
 */

/** jsdom does not implement scrollIntoView, which focus management calls. */
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
