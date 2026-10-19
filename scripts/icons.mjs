/**
 * Icônes et écrans de lancement iPhone, dessinés par le Chromium de Playwright à partir de
 * public/favicon.svg. À relancer (`pnpm icons`) seulement si le logo change ; les images sont versionnées.
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

export const SPLASHES = [
  // largeur × hauteur en points CSS, densité ; un écran par famille d'iPhone (portrait)
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [430, 932, 3], // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [420, 912, 3], // Air
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [390, 844, 3], // 12, 13, 14, 16e
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [375, 667, 2], // SE, 8
]
export const CANVAS = { light: '#eceef7', dark: '#07070b' }

const svg = readFileSync('public/favicon.svg', 'utf8')
// Pastille pleine (iOS et Android arrondissent eux-mêmes) et logo réduit pour la zone sûre « maskable ».
const fullBleed = svg.replace('rx="8"', 'rx="0"')
const maskable = fullBleed.replace('translate(4 4)', 'translate(6.4 6.4) scale(0.8)')

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
})

async function shot(path, width, height, body, scale = 1) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
  await page.setContent(`<style>html,body{margin:0;height:100%}</style>${body}`)
  await page.screenshot({ path, omitBackground: true })
  await page.close()
}

const fit = (s, size) =>
  `<div style="width:${size}px;height:${size}px">${s.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>`

mkdirSync('public/icons', { recursive: true })
mkdirSync('public/splash', { recursive: true })
await shot('public/apple-touch-icon.png', 180, 180, fit(fullBleed, 180))
await shot('public/icons/icon-192.png', 192, 192, fit(svg, 192))
await shot('public/icons/icon-512.png', 512, 512, fit(svg, 512))
await shot('public/icons/icon-maskable-512.png', 512, 512, fit(maskable, 512))

for (const [w, h, dpr] of SPLASHES)
  for (const [theme, color] of Object.entries(CANVAS)) {
    const logo = Math.round(w * 0.24)
    await shot(
      `public/splash/${w * dpr}x${h * dpr}-${theme}.png`,
      w,
      h,
      `<div style="height:100%;display:flex;align-items:center;justify-content:center;background:${color}">
         <div style="width:${logo}px;height:${logo}px;border-radius:${logo * 0.25}px;overflow:hidden;
           box-shadow:0 ${logo * 0.12}px ${logo * 0.3}px -${logo * 0.1}px rgba(74,61,220,.45)">${fit(fullBleed, logo)}</div>
       </div>`,
      dpr,
    )
  }

await browser.close()
console.log('Icônes et écrans de lancement générés dans public/')
