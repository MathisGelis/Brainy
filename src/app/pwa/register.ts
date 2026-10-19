import { registerSW } from 'virtual:pwa-register'
import { setUpdateReady } from './updateStore'

const HOUR = 60 * 60 * 1000

/**
 * Service worker (build de prod seulement). Une nouvelle version est proposée, jamais imposée :
 * elle est cherchée toutes les heures et au retour au premier plan (l'app installée reste ouverte longtemps).
 */
export function registerServiceWorker() {
  const updateSW = registerSW({
    onNeedRefresh: () => setUpdateReady(() => void updateSW(true)),
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) void registration.update()
      }
      setInterval(check, HOUR)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
}
