import type { Page } from '@playwright/test'

/** Ouvre une section : par son onglet s'il est visible, sinon par le menu « Plus » (mobile). */
export async function openSection(page: Page, name: string) {
  const tab = page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name, exact: true })
  if ((await tab.count()) > 0) return tab.first().click()
  await page.getByRole('button', { name: 'Plus' }).click()
  await page
    .getByRole('navigation', { name: 'Autres sections' })
    .getByRole('link', { name, exact: true })
    .click()
}
