import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'brainy.theme'
const THEME_COLORS: Record<Theme, string> = { light: '#eceef7', dark: '#07070b' }

export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* stockage indisponible : le thème vaut pour la session */
  }
}

export function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Thème actuellement affiché (posé sur <html> par index.html puis par `applyTheme`). */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme])
}

/** Fondu enchaîné entre les deux thèmes quand le navigateur sait le faire. */
function withTransition(update: () => void) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition && !reduced) doc.startViewTransition(update)
  else update()
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  // Tous les boutons restent synchronisés sur l'attribut posé sur <html>, quelle que soit la source.
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(currentTheme()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  // Sans choix explicite, on suit le système en direct.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = () => {
      if (!readStoredTheme()) applyTheme(systemTheme())
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    storeTheme(next)
    withTransition(() => applyTheme(next))
    setTheme(next)
  }, [])

  return { theme, toggle }
}
