import { expect, test } from '@playwright/test'
import { installFakeSupabase, parisToday } from './fakeSupabase'

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

test('recette : créer, ajouter au menu en parts, ingrédients vers la liste de courses', async ({
  page,
}) => {
  const db = await installFakeSupabase(page, {
    macro_targets: [{ id: 'mt1', kcal: 2000, protein_g: null, carbs_g: null, fat_g: null }],
  })
  await page.goto('#/menu')
  const recipes = page.getByRole('region', { name: 'Recettes et repas types' })
  await recipes.getByLabel('Nom de la nouvelle recette').fill('Curry de poulet')
  await recipes.getByLabel('Nombre de parts').fill('4')
  await recipes.getByLabel('Nombre de parts').press('Enter')
  const ingredient = recipes.getByLabel('Ajouter un ingrédient à « Curry de poulet »')
  await ingredient.fill('600 g poulet cru')
  await ingredient.press('Enter')
  await ingredient.fill('300 g riz blanc cru')
  await ingredient.press('Enter')
  await expect(recipes.getByText(/Par part : 225 g · 446 kcal/)).toBeVisible()

  const input = page.getByLabel('Ajouter un aliment')
  await input.fill('2 parts curry soir')
  await input.press('Enter')
  const dinner = page.getByRole('region', { name: /Dîner/ })
  await expect(dinner.getByText('Curry de poulet')).toBeVisible()
  await expect.poll(() => db.meal_items?.[0]?.recipe_id).toBe(db.recipes?.[0]?.id)

  const proposal = page.getByText('à la liste de courses ?').locator('xpath=ancestor::div[1]')
  await expect(proposal).toContainText('les 2 ingrédients manquants (Poulet, Riz blanc)')
  await proposal.getByRole('button', { name: 'Ajouter' }).click()
  await expect.poll(() => db.todos?.map((t) => t.title)).toEqual(['Poulet', 'Riz blanc'])

  // l'accueil reprend les kcal restantes et le dîner prévu
  await page.goto('')
  await expect(
    page.getByRole('link', { name: /1\s107 kcal restantes\. Dîner prévu : Curry de poulet/ }),
  ).toBeVisible()
})

test('copier le menu d’hier puis payer les courses', async ({ page }) => {
  const yesterday = shift(parisToday(), -1)
  const db = await installFakeSupabase(page, {
    meal_items: [
      {
        id: 'y1',
        day: yesterday,
        meal: 'lunch',
        food_id: null,
        recipe_id: null,
        name: 'Saumon',
        grams: 140,
        kcal: 280,
        protein_dg: 280,
        carbs_dg: 0,
        fat_dg: 182,
        position: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    expense_categories: [
      {
        id: 'c1',
        name: 'Courses',
        color: null,
        monthly_budget_cents: null,
        position: 0,
        archived: false,
      },
    ],
  })
  await page.goto('#/menu')
  await page.getByRole('button', { name: 'Copier un menu…' }).click()
  await page.getByRole('button', { name: /^Copier le menu du .* vers le / }).click()
  await expect(page.getByRole('region', { name: /Déjeuner/ }).getByText('Saumon')).toBeVisible()
  await expect.poll(() => db.meal_items?.filter((i) => i.day === parisToday()).length).toBe(1)

  const shopping = page.getByRole('region', { name: 'Liste de courses' })
  await shopping.getByRole('button', { name: 'Ajouter' }).click() // « Saumon » est au menu mais pas sur la liste
  await shopping.getByRole('checkbox', { name: 'Acheté : Saumon' }).click()
  const prompt = shopping.getByRole('form', { name: 'Dépense des courses' })
  await prompt.getByLabel('Montant des courses en euros').fill('23,90')
  await prompt.getByLabel('Montant des courses en euros').press('Enter')
  await expect
    .poll(() => db.expenses?.map((e) => [e.amount_cents, e.category_id, e.note]))
    .toEqual([[2390, 'c1', 'Courses']])
})
