export type ThemeMode = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'cyfrosec.theme'

export function resolveThemeMode(storedTheme: string | null, prefersDark: boolean): ThemeMode {
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }
  return prefersDark ? 'dark' : 'light'
}
