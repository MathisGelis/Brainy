import { expect, test } from '@playwright/test'
import { installFakeSupabase, parisToday } from './fakeSupabase'

test('menu : ajouter un aliment de la base, suivre les macros, remplir la liste de courses', async ({
  page,
}) => {
  const db = await installFakeSupabase(page, {
    macro_targets: [{ id: 'mt1', kcal: 2000, protein_g: 120, carbs_g: null, fat_g: null }],
  })
  await page.goto('#/menu')
  const input = page.getByLabel('Ajouter un aliment')
  await input.fill('150 g poulet cuit midi')
  await expect(page.getByText('Poulet (filet cuit)', { exact: true })).toBeVisible()
  await input.press('Enter')

  const lunch = page.getByRole('region', { name: /Déjeuner/ })
  await expect(lunch.getByText('Poulet (filet cuit)')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Macros du jour' })).toContainText('248')
  await expect.poll(() => db.meal_items?.[0]?.grams).toBe(150)
  await expect.poll(() => db.foods?.[0]?.name).toBe('Poulet (filet cuit)')

  // proposition : l'ajouter à la liste de courses
  const proposal = page.getByText('à la liste de courses ?').locator('xpath=ancestor::div[1]')
  await proposal.getByRole('button', { name: 'Ajouter' }).click()
  const shopping = page.getByRole('region', { name: 'Liste de courses' })
  await expect(shopping.getByRole('checkbox', { name: 'Acheté : Poulet' })).toBeVisible()
  await expect.poll(() => db.todo_lists?.map((l) => l.name)).toEqual(['Courses'])
  await expect.poll(() => db.todos?.map((t) => t.title)).toEqual(['Poulet'])

  // déjà sur la liste : plus de proposition pour le même aliment
  await input.fill('100 g poulet cuit soir')
  await input.press('Enter')
  await expect(
    page.getByRole('region', { name: /Dîner/ }).getByText('Poulet (filet cuit)'),
  ).toBeVisible()
  await expect(page.getByText('à la liste de courses ?')).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('region', { name: 'Macros du jour' })).toContainText('413')
  expect(db.meal_items?.every((i) => i.day === parisToday())).toBe(true)
})

test('menu : un aliment inconnu se crée une fois puis se retrouve', async ({ page }) => {
  const db = await installFakeSupabase(page)
  await page.goto('#/menu')
  const input = page.getByLabel('Ajouter un aliment')
  await input.fill('80 g tofu fumé')
  const form = page.getByRole('region', { name: 'Nouvel aliment « Tofu fumé »' })
  await form.getByLabel('kcal').fill('180')
  await form.getByLabel('Protéines (g)').fill('16,5')
  await form.getByLabel('Lipides (g)').fill('12')
  await form.getByRole('button', { name: 'Créer et ajouter' }).click()
  await expect.poll(() => db.foods?.map((f) => f.name)).toEqual(['Tofu fumé'])

  await input.fill('tofu')
  await expect(page.getByText('Tofu fumé', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: /Nouvel aliment/ })).toHaveCount(0)
})
