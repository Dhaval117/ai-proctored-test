import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  type Theme,
  makeStyles,
} from '@fluentui/react-components'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  resolvedTheme: 'light' | 'dark'
  fluentTheme: Theme
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'proctor_theme'

// Monochrome luxury overrides replacing default Fluent blue (#0078D4) with black, white, and grey
const customLightTheme: Theme = {
  ...webLightTheme,
  colorBrandBackground: '#111111',
  colorBrandBackgroundHover: '#2b2b2b',
  colorBrandBackgroundPressed: '#000000',
  colorBrandBackgroundSelected: '#111111',
  colorNeutralForegroundOnBrand: '#ffffff',
  colorBrandForeground1: '#111111',
  colorBrandForeground2: '#2b2b2b',
  colorBrandStroke1: '#111111',
  colorBrandStroke2: '#404040',
  colorCompoundBrandStroke: '#111111',
  colorCompoundBrandStrokeHover: '#2b2b2b',
  colorCompoundBrandStrokePressed: '#000000',
  colorCompoundBrandForeground1: '#111111',
  colorCompoundBrandForeground1Hover: '#2b2b2b',
  colorCompoundBrandForeground1Pressed: '#000000',
}

const customDarkTheme: Theme = {
  ...webDarkTheme,
  colorBrandBackground: '#ffffff',
  colorBrandBackgroundHover: '#e0e0e0',
  colorBrandBackgroundPressed: '#cccccc',
  colorBrandBackgroundSelected: '#ffffff',
  colorNeutralForegroundOnBrand: '#111111',
  colorBrandForeground1: '#ffffff',
  colorBrandForeground2: '#e0e0e0',
  colorBrandStroke1: '#ffffff',
  colorBrandStroke2: '#cccccc',
  colorCompoundBrandStroke: '#ffffff',
  colorCompoundBrandStrokeHover: '#e0e0e0',
  colorCompoundBrandStrokePressed: '#cccccc',
  colorCompoundBrandForeground1: '#ffffff',
  colorCompoundBrandForeground1Hover: '#e0e0e0',
  colorCompoundBrandForeground1Pressed: '#cccccc',
}

const useProviderStyles = makeStyles({
  root: {
    minHeight: '100dvh',
    backgroundColor: 'var(--bg-page)',
    color: 'var(--text-main)',
  },
})

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const styles = useProviderStyles()
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  })

  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  }

  const resolvedTheme: 'light' | 'dark' = themeMode === 'system' ? systemPreference : themeMode
  const fluentTheme: Theme = resolvedTheme === 'dark' ? customDarkTheme : customLightTheme

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', resolvedTheme)
    root.style.colorScheme = resolvedTheme

    if (resolvedTheme === 'dark') {
      root.style.setProperty('--bg-page', '#121214')
      root.style.setProperty('--bg-card', '#1e1e20')
      root.style.setProperty('--border-subtle', '#2e2e32')
      root.style.setProperty('--text-main', '#f5f5f7')
      root.style.setProperty('--text-muted', '#a0a0a6')
    } else {
      root.style.setProperty('--bg-page', '#f9f9fb')
      root.style.setProperty('--bg-card', '#ffffff')
      root.style.setProperty('--border-subtle', '#e4e4e8')
      root.style.setProperty('--text-main', '#1c1c1f')
      root.style.setProperty('--text-muted', '#686870')
    }
  }, [resolvedTheme])

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, resolvedTheme, fluentTheme }}>
      <FluentProvider theme={fluentTheme} className={styles.root}>
        {children}
      </FluentProvider>
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (!context) {
    return {
      themeMode: 'system',
      setThemeMode: () => {},
      resolvedTheme: 'light',
      fluentTheme: customLightTheme,
    }
  }
  return context
}
