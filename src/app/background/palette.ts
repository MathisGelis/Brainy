import type { Theme } from '@/lib/theme'

/** Couleurs du fond animé, alignées sur les tokens CSS (--canvas, --blob-*) de chaque thème. */
export const PALETTES: Record<
  Theme,
  { base: string; colors: [string, string, string, string]; tint: string; dark: number }
> = {
  light: {
    base: '#eceef7',
    colors: ['#cbc3ff', '#ffd5c6', '#bfe0ff', '#c7f1e2'],
    tint: '#eae6ff',
    dark: 0,
  },
  dark: {
    base: '#07070b',
    colors: ['#2a1f66', '#461b42', '#0f3460', '#0c3a37'],
    tint: '#3b3270',
    dark: 1,
  },
}

/** `#rrggbb` → composantes 0..1 (sRGB, telles quelles : les shaders travaillent en sRGB). */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
