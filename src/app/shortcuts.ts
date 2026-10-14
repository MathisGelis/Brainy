import { useEffect, useRef } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'

/** `g` puis une lettre : navigation entre onglets. */
export const NAV_SHORTCUTS: { key: string; to: string; label: string }[] = [
  { key: 'a', to: '/', label: "Aujourd'hui" },
  { key: 'o', to: '/objectifs', label: 'Objectifs' },
  { key: 'n', to: '/notes', label: 'Notes' },
  { key: 'h', to: '/habitudes', label: 'Habitudes' },
  { key: 't', to: '/todo', label: 'Todo' },
  { key: 'b', to: '/budget', label: 'Budget' },
  { key: 'c', to: '/calendrier', label: 'Calendrier' },
  { key: 'r', to: '/revue', label: 'Revue de la semaine' },
]

export const OTHER_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '⌘ K', label: 'Palette : rechercher, aller à, créer (Ctrl K sous Windows)' },
  { keys: 'n', label: 'Ajout rapide (todo, note, dépense)' },
  { keys: '/', label: 'Rechercher dans les notes' },
  { keys: '?', label: 'Afficher les raccourcis' },
  { keys: 'Échap', label: 'Fermer' },
]

const SEQUENCE_TIMEOUT_MS = 1500

/** Vrai si la frappe vise un champ de saisie : les raccourcis ne doivent pas l'intercepter. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

/** Met le focus sur le champ de recherche de la page, en allant sur Notes s'il n'y en a pas. */
function focusSearch(navigate: NavigateFunction) {
  const find = () => document.querySelector<HTMLInputElement>('[data-search]')
  const field = find()
  if (field) {
    field.focus()
    return
  }
  navigate('/notes')
  // La page Notes est chargée à la demande : on réessaie brièvement.
  let tries = 0
  const timer = setInterval(() => {
    const el = find()
    if (el || ++tries > 20) {
      clearInterval(timer)
      el?.focus()
    }
  }, 50)
}

type Handlers = {
  onNew: () => void
  onHelp: () => void
  onEscape: () => void
  onPalette: () => void
}

export function useShortcuts(handlers: Handlers) {
  const navigate = useNavigate()
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    let gPressedAt = 0

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        ref.current.onEscape()
        return
      }
      // Cmd/Ctrl+K : fonctionne aussi pendant la saisie
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ref.current.onPalette()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return

      if (gPressedAt && Date.now() - gPressedAt < SEQUENCE_TIMEOUT_MS) {
        gPressedAt = 0
        const dest = NAV_SHORTCUTS.find((s) => s.key === e.key)
        if (dest) {
          e.preventDefault()
          navigate(dest.to)
        }
        return
      }

      switch (e.key) {
        case 'g':
          gPressedAt = Date.now()
          break
        case 'n':
          e.preventDefault()
          ref.current.onNew()
          break
        case '/':
          e.preventDefault()
          focusSearch(navigate)
          break
        case '?':
          e.preventDefault()
          ref.current.onHelp()
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])
}
