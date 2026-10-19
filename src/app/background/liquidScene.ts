import {
  IcosahedronGeometry,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { CELEBRATE_EVENT } from '@/lib/celebrate'
import { currentTheme } from '@/lib/theme'
import { isSoftwareRenderer } from './gpu'
import { hexToRgb, PALETTES } from './palette'
import { auroraFragment, auroraVertex, orbFragment, orbVertex } from './shaders'

const FPS = 40
/** En dessous de cette cadence mesurée, l'appareil peine : on fige la scène. */
const MIN_FPS = 20
const WATCHDOG_MS = 3000
const CAMERA_Z = 6
const FOV = 35

type Options = { reducedMotion: boolean; onFirstFrame: () => void }

const vec3 = (hex: string) => new Vector3(...hexToRgb(hex))

/**
 * Fond « liquide » : aurore + orbe irisé + goutte satellite.
 * Rendu en basse définition (il est flouté par le verre), ~40 i/s, en pause onglet masqué.
 * Renvoie une fonction de nettoyage.
 */
export function createLiquidScene(
  canvas: HTMLCanvasElement,
  { reducedMotion, onFirstFrame }: Options,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const renderer = new WebGLRenderer({
    canvas,
    antialias: dpr < 2,
    alpha: false,
    powerPreference: 'low-power',
  })
  renderer.setPixelRatio(dpr)
  // Image fixe : animations réduites, ou pas de GPU (ou appareil trop lent, voir le chien de garde).
  let still = reducedMotion || isSoftwareRenderer(renderer.getContext())

  const scene = new Scene()
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 50)
  camera.position.z = CAMERA_Z

  // Aurore plein écran (indépendante de la caméra)
  const palette = PALETTES[currentTheme()]
  const auroraUniforms = {
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uBase: { value: vec3(palette.base) },
    uColor1: { value: vec3(palette.colors[0]) },
    uColor2: { value: vec3(palette.colors[1]) },
    uColor3: { value: vec3(palette.colors[2]) },
    uColor4: { value: vec3(palette.colors[3]) },
  }
  const aurora = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      vertexShader: auroraVertex,
      fragmentShader: auroraFragment,
      uniforms: auroraUniforms,
      depthTest: false,
      depthWrite: false,
    }),
  )
  aurora.frustumCulled = false
  aurora.renderOrder = -1
  scene.add(aurora)

  // Orbes : même géométrie, matériaux distincts (graine de bruit différente)
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  const geometry = new IcosahedronGeometry(1, small ? 28 : 40)
  const makeOrb = (seed: number, amp: number) => {
    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: amp },
      uPulse: { value: 0 },
      uSeed: { value: seed },
      uDark: { value: palette.dark },
      uTint: { value: vec3(palette.tint) },
    }
    const mesh = new Mesh(
      geometry,
      new ShaderMaterial({
        vertexShader: orbVertex,
        fragmentShader: orbFragment,
        uniforms,
        transparent: true,
      }),
    )
    scene.add(mesh)
    return { mesh, uniforms }
  }
  const orb = makeOrb(0, 0.17)
  const drop = makeOrb(17.3, 0.09)

  // État animé
  let time = still ? 12 : 0
  let pulse = 0
  const pointer = new Vector2(0, 0)
  const pointerSmooth = new Vector2(0, 0)
  const layout = { x: 0, y: 0, scale: 1 }

  // Transition douce des couleurs au changement de thème
  const target = {
    base: vec3(palette.base),
    colors: palette.colors.map(vec3),
    tint: vec3(palette.tint),
    dark: palette.dark,
  }
  function setThemeTarget() {
    const p = PALETTES[currentTheme()]
    target.base = vec3(p.base)
    target.colors = p.colors.map(vec3)
    target.tint = vec3(p.tint)
    target.dark = p.dark
  }
  function easeColors(k: number) {
    auroraUniforms.uBase.value.lerp(target.base, k)
    ;[
      auroraUniforms.uColor1,
      auroraUniforms.uColor2,
      auroraUniforms.uColor3,
      auroraUniforms.uColor4,
    ].forEach((u, i) => u.value.lerp(target.colors[i]!, k))
    for (const o of [orb, drop]) {
      o.uniforms.uTint.value.lerp(target.tint, k)
      o.uniforms.uDark.value += (target.dark - o.uniforms.uDark.value) * k
    }
  }

  function resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    auroraUniforms.uResolution.value.set(w, h)
    // Dimensions visibles au plan z = 0
    const viewH = 2 * Math.tan((FOV * Math.PI) / 360) * CAMERA_Z
    const viewW = viewH * camera.aspect
    if (camera.aspect >= 1) {
      // desktop : à droite, débordant derrière le contenu
      layout.x = viewW * 0.31
      layout.y = viewH * 0.1
      layout.scale = viewH * 0.25
    } else {
      // mobile : en haut, derrière le titre
      layout.x = viewW * 0.22
      layout.y = viewH * 0.3
      layout.scale = viewW * 0.42
    }
  }

  function update(dt: number) {
    if (!still) time += dt
    pulse *= Math.pow(0.12, dt) // décroissance exponentielle (~1 s)
    pointerSmooth.lerp(pointer, Math.min(1, dt * 2.5))
    easeColors(still ? 1 : Math.min(1, dt * 3))

    auroraUniforms.uTime.value = time
    const breathe = 1 + Math.sin(time * 0.6) * 0.015 + pulse * 0.06
    orb.mesh.position.set(layout.x + pointerSmooth.x * 0.25, layout.y + pointerSmooth.y * 0.18, 0)
    orb.mesh.scale.setScalar(layout.scale * breathe)
    orb.mesh.rotation.set(
      time * 0.05 + pointerSmooth.y * 0.3,
      time * 0.08 + pointerSmooth.x * 0.4,
      0,
    )

    const angle = time * 0.13 + 2.2
    const radius = layout.scale * 1.55
    drop.mesh.position.set(
      orb.mesh.position.x + Math.cos(angle) * radius,
      orb.mesh.position.y + Math.sin(angle) * radius * 0.55,
      Math.sin(angle) * 0.6,
    )
    drop.mesh.scale.setScalar(layout.scale * 0.2 * (1 + pulse * 0.1))
    drop.mesh.rotation.set(time * 0.2, time * 0.15, 0)

    for (const o of [orb, drop]) {
      o.uniforms.uTime.value = time
      o.uniforms.uPulse.value = pulse
    }
  }

  let raf = 0
  let last = performance.now()
  let accumulator = 0
  let firstFrame = true
  let watchdogStart = 0
  let watchdogFrames = 0

  function render() {
    renderer.render(scene, camera)
    if (firstFrame) {
      firstFrame = false
      onFirstFrame()
    }
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop)
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    accumulator += dt
    if (accumulator < 1 / FPS) return
    update(accumulator)
    accumulator = 0
    render()
    watchdog(now)
  }

  // Si la cadence reste trop basse au démarrage, on passe en image fixe.
  function watchdog(now: number) {
    if (watchdogStart < 0) return
    if (!watchdogStart) watchdogStart = now
    watchdogFrames++
    const elapsed = now - watchdogStart
    if (elapsed < WATCHDOG_MS) return
    if ((watchdogFrames * 1000) / elapsed < MIN_FPS) {
      stop()
      still = true
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate)
      renderStill()
    }
    watchdogStart = -1
  }

  function start() {
    if (raf || still) return
    last = performance.now()
    if (watchdogStart > 0) watchdogStart = 0
    raf = requestAnimationFrame(loop)
  }
  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  // Images fixes quand les animations sont réduites : on redessine seulement si nécessaire.
  const renderStill = () => {
    update(0)
    render()
  }

  const onResize = () => (still ? (resize(), renderStill()) : resize())
  const onPointer = (e: PointerEvent) => {
    pointer.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1),
    )
  }
  const onVisibility = () => (document.hidden ? stop() : start())
  const onCelebrate = (e: Event) => {
    const strength = (e as CustomEvent<number>).detail ?? 1
    pulse = Math.min(1.6, pulse + strength)
  }
  const themeObserver = new MutationObserver(() => {
    setThemeTarget()
    if (still) renderStill()
  })

  resize()
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  if (!still) {
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener(CELEBRATE_EVENT, onCelebrate)
    start()
  } else {
    renderStill()
  }

  return () => {
    stop()
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener(CELEBRATE_EVENT, onCelebrate)
    document.removeEventListener('visibilitychange', onVisibility)
    themeObserver.disconnect()
    geometry.dispose()
    aurora.geometry.dispose()
    ;(aurora.material as ShaderMaterial).dispose()
    ;(orb.mesh.material as ShaderMaterial).dispose()
    ;(drop.mesh.material as ShaderMaterial).dispose()
    renderer.dispose()
  }
}
