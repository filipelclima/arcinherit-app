import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})

// jsdom doesn't implement matchMedia at all -- any component that reads a media query (dark mode,
// reduced motion) would throw "window.matchMedia is not a function" the moment a test renders/clicks
// it, even when that test has nothing to do with media queries. Default: no preference/no match;
// tests that care about a specific query (see useTheme.test.tsx) stub this themselves with
// vi.stubGlobal, which takes precedence over this default for the duration of that test.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList
}

// jsdom doesn't implement scrollIntoView either (no layout engine to scroll) -- a no-op is enough
// for tests, which only assert that it was called and with what, not that the page actually moved.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
