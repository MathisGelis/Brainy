import { lazy, Suspense, useEffect, useState } from 'react'
import { hasHardwareWebGL } from './gpu'

const LiquidBackground = lazy(() => import('./LiquidBackground'))

type NetworkInfo = { saveData?: boolean }

/** three.js n'est chargé qu'avec un GPU et si l'utilisateur n'économise pas ses données. */
export function canRenderBackground(): boolean {
  if (typeof window === 'undefined' || !('WebGLRenderingContext' in window)) return false
  const connection = (navigator as Navigator & { connection?: NetworkInfo }).connection
  if (connection?.saveData) return false
  return hasHardwareWebGL()
}

/** Monte le fond animé une fois la page affichée, quand le navigateur est inactif. */
export function BackgroundLoader() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!('WebGLRenderingContext' in window)) return
    const mount = () => {
      if (canRenderBackground()) setReady(true)
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(mount, { timeout: 2500 })
      return () => w.cancelIdleCallback?.(id)
    }
    const id = window.setTimeout(mount, 800)
    return () => window.clearTimeout(id)
  }, [])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <LiquidBackground />
    </Suspense>
  )
}
