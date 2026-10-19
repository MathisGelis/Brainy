/** Noms de moteurs WebGL logiciels (sans accélération GPU). */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i

/** Forçage pour le débogage (machine virtuelle, captures) : localStorage `brainy.webgl` = `force`. */
export const FORCE_WEBGL_KEY = 'brainy.webgl'

export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  return SOFTWARE_RENDERER.test(name)
}

export function isWebglForced(): boolean {
  try {
    return localStorage.getItem(FORCE_WEBGL_KEY) === 'force'
  } catch {
    return false
  }
}

/**
 * Vrai si WebGL est accéléré par un GPU. Sonde légère, sans three.js : sans GPU,
 * le fond animé saturerait le processeur, on garde alors le dégradé CSS.
 */
export function hasHardwareWebGL(): boolean {
  if (typeof window === 'undefined' || !('WebGLRenderingContext' in window)) return false
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as
      WebGL2RenderingContext | WebGLRenderingContext | null
    if (!gl) return false
    const software = isSoftwareRenderer(gl)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return !software || isWebglForced()
  } catch {
    return false
  }
}
