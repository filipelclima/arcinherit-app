import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from './useTheme'

function mockMatchMedia(prefersDark: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' && prefersDark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
}

function Consumer() {
  const { theme, toggle } = useTheme()
  return (
    <button data-testid="consumer" onClick={toggle}>{theme}</button>
  )
}

describe('useTheme / ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('is safe to call without a provider — defaults to light and a no-op toggle (existing tests never wrap components in ThemeProvider)', () => {
    render(<Consumer />)
    expect(screen.getByTestId('consumer')).toHaveTextContent('light')

    fireEvent.click(screen.getByTestId('consumer'))
    expect(screen.getByTestId('consumer')).toHaveTextContent('light') // unchanged: no-op toggle
  })

  it('picks up a previously-saved preference over the system preference', () => {
    mockMatchMedia(true) // system says dark
    localStorage.setItem('heirloom-theme', 'light') // user had chosen light before

    render(<ThemeProvider><Consumer /></ThemeProvider>)

    expect(screen.getByTestId('consumer')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('falls back to the system (prefers-color-scheme) preference when nothing was saved before', () => {
    mockMatchMedia(true) // system says dark, nothing in localStorage

    render(<ThemeProvider><Consumer /></ThemeProvider>)

    expect(screen.getByTestId('consumer')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('defaults to light when the system has no preference and nothing was saved', () => {
    mockMatchMedia(false)

    render(<ThemeProvider><Consumer /></ThemeProvider>)

    expect(screen.getByTestId('consumer')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggles the theme, updates the <html> class, and persists the choice to localStorage', () => {
    mockMatchMedia(false)
    render(<ThemeProvider><Consumer /></ThemeProvider>)

    fireEvent.click(screen.getByTestId('consumer'))
    expect(screen.getByTestId('consumer')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('heirloom-theme')).toBe('dark')

    fireEvent.click(screen.getByTestId('consumer'))
    expect(screen.getByTestId('consumer')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('heirloom-theme')).toBe('light')
  })

  it('a manually-toggled choice survives remounting the provider (reads back from localStorage)', () => {
    mockMatchMedia(false)
    const { unmount } = render(<ThemeProvider><Consumer /></ThemeProvider>)

    fireEvent.click(screen.getByTestId('consumer'))
    expect(screen.getByTestId('consumer')).toHaveTextContent('dark')
    unmount()

    render(<ThemeProvider><Consumer /></ThemeProvider>)
    expect(screen.getByTestId('consumer')).toHaveTextContent('dark')
  })
})
