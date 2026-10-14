import { expect, test } from '@playwright/test'
import { installFakeSupabase } from './fakeSupabase'

test.use({ colorScheme: 'light' })

test('bascule clair/sombre, mémorisée après rechargement', async ({ page }) => {
  await installFakeSupabase(page)
  await page.goto('')
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'light')

  await page
    .getByRole('button', { name: 'Passer en mode sombre' })
    .filter({ visible: true })
    .first()
    .click()
  await expect(html).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.getByRole('button', { name: 'Passer en mode clair' }).filter({ visible: true }).first(),
  ).toBeVisible()
})

test('suit le thème du système sans choix enregistré', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' })
  const page = await context.newPage()
  await page.goto('http://localhost:5199/Brainy/#/connexion')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await context.close()
})
