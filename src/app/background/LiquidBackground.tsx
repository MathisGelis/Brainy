import { useEffect, useRef, useState } from 'react'
import { createLiquidScene } from './liquidScene'

/** Canvas plein écran derrière l'interface ; apparaît en fondu à la première image. */
export default function LiquidBackground() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    try {
      return createLiquidScene(canvas, { reducedMotion, onFirstFrame: () => setVisible(true) })
    } catch {
      // WebGL indisponible : le dégradé CSS (body::before) reste affiché.
      return undefined
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[-1] h-full w-full transition-opacity duration-[1200ms] ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}
