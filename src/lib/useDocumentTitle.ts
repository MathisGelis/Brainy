import { useEffect } from 'react'

/** Titre de l'onglet, utile pour l'historique et les lecteurs d'écran. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Cockpit` : 'Cockpit'
  }, [title])
}
