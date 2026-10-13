'use client'

import { useEffect, useState } from 'react'
import { resolveThemeMode, THEME_STORAGE_KEY, type ThemeMode } from '@/app/lib/theme-mode'

export type { ThemeMode } from '@/app/lib/theme-mode'

function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  if (document.documentElement.classList.contains('dark')) {
    return 'dark'
  }

  return resolveThemeMode(storedTheme, window.matchMedia('(prefers-color-scheme: dark)').matches)
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(resolveInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Persist only a theme the visitor chose. Writing on every mount stored a
  // preference on first visit, before any choice or consent; the Cookie Policy
  // registers this key as set only when you choose a theme.
  const chooseTheme = (next: ThemeMode) => {
    setTheme(next)
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
  }

  const toggleTheme = () => {
    chooseTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme: chooseTheme, toggleTheme }
}
