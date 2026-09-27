'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'heirloom-theme'

// A default (not undefined) context value means useTheme() is safe to call even without a
// <ThemeProvider> above it -- it just behaves as a no-op stuck on 'light'. That keeps every existing
// test that renders a component tree without wrapping it in the provider working unchanged; the real
// app always has the provider (see app/providers.tsx).
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
})

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts 'light' on the server and on the client's very first render, so hydration always matches
  // -- the inline script in layout.tsx has already set the real class on <html> by the time this
  // mounts (avoiding a flash of the wrong theme), and this effect just catches the React-side state
  // up to what's already on the page.
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    const initial = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(initial)
    applyTheme(initial)
  }, [])

  function toggle() {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      applyTheme(next)
      return next
    })
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
