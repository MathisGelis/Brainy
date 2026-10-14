import { expect, test } from '@playwright/test'

// Chromium headless n'a pas de GPU (rendu logiciel SwiftShader) : c'est le cas « sans GPU ».

test('sans GPU, three.js n’est pas téléchargé (dégradé CSS conservé)', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (r) => requested.push(r.url()))
  await page.goto('#/connexion')
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
  await page.waitForTimeout(3500) // au-delà du délai de repos (2,5 s)
  expect(requested.filter((url) => url.includes('LiquidBackground'))).toEqual([])
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('forcé, le fond three.js compile et apparaît sans erreur', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && /three|shader|webgl/i.test(m.text())) errors.push(m.text())
  })
  await page.addInitScript(() => localStorage.setItem('cockpit.webgl', 'force'))
  await page.goto('#/connexion')
  await expect(page.locator('canvas.opacity-100')).toHaveCount(1, { timeout: 20000 })
  await expect(page.locator('canvas')).toHaveAttribute('aria-hidden', 'true')
  expect(errors).toEqual([])
})
