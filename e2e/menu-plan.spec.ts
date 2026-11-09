import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { installFakeSupabase, parisToday } from './fakeSupabase'

const PLAN = `# Plan repas

## Objectifs
- Calories : 2100 kcal
- Protéines : 140 g

## Aliments
| Aliment | kcal | Protéines | Glucides | Lipides | Portion |
|---|---|---|---|---|---|
| Skyr | 63 | 11 | 4 | 0,2 | 150 g (1 pot) |
| Poulet (filet cru) | 120 | 22,5 | 0 | 2,6 | |
| Riz basmati (cuit) | 130 | 2,7 | 28 | 0,3 | |

## Recettes
### Poulet riz (2 parts)
- 300 g Poulet (filet cru)
- 400 g Riz basmati (cuit)

## Semaine
### Lundi
- Petit-déjeuner : 1 Skyr
- Déjeuner : Poulet riz (1 part)
### Jeudi
- Dîner : Soupe maison (320 kcal, P 12, G 40, L 10)
- Collation : 30 g Zorglub
`

function monday(weeksAhead: number) {
  const d = new Date(`${parisToday()}T12:00:00Z`)
  const wd = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - wd + 1 + 7 * weeksAhead)
  return d.toISOString().slice(0, 10)
}
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function openImport(page: Page) {
  await page.goto('#/menu')
  await page.getByText('Importer un plan de repas (.md)').click()
  await page.getByLabel('Fichier du plan de repas').setInputFiles({
    name: 'plan.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(PLAN),
  })
}

test('menu : importer un plan .md, répété sur 2 semaines à partir de la semaine prochaine', async ({
  page,
}) => {
  const next = monday(1)
  const db = await installFakeSupabase(page, {
    // un repas déjà prévu le lundi suivant : remplacé
    meal_items: [
      {
        id: 'old',
        day: next,
        meal: 'lunch',
        food_id: null,
        recipe_id: null,
        name: 'Ancien repas',
        grams: 100,
        kcal: 500,
        protein_dg: 0,
        carbs_dg: 0,
        fat_dg: 0,
        position: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  })
  await openImport(page)

  const summary = page.getByRole('list', { name: 'Contenu du plan' })
  await expect(summary).toContainText('1 recette')
  await expect(summary).toContainText('3 aliments ajoutés')
  await expect(summary).toContainText('Objectifs : 2100 kcal, P 140 g')
  await expect(page.getByRole('alert')).toContainText('aliment inconnu « Zorglub »')

  await page.getByRole('combobox', { name: 'Semaine de départ' }).click()
  await page.getByRole('option', { name: /^Semaine prochaine/ }).click()
  await page.getByRole('combobox', { name: 'Nombre de semaines' }).click()
  await page.getByRole('option', { name: '2 semaines' }).click()
  await expect(summary).toContainText('6 éléments de repas sur 4 jours')
  await page.getByRole('button', { name: 'Importer', exact: true }).click()

  await expect(page.getByText(/^Plan importé : 6 éléments sur 4 jours/)).toBeVisible()
  await expect.poll(() => db.meal_items?.length).toBe(6)
  expect(db.meal_items!.some((m) => m.id === 'old')).toBe(false)
  const days = [...new Set(db.meal_items!.map((m) => m.day))].sort()
  expect(days).toEqual([next, plusDays(next, 3), plusDays(next, 7), plusDays(next, 10)])
  const lunch = db.meal_items!.find((m) => m.day === next && m.meal === 'lunch')!
  expect(lunch).toMatchObject({ name: 'Poulet riz', grams: 350, kcal: 440 })
  expect(db.meal_items!.find((m) => m.day === next && m.meal === 'breakfast')).toMatchObject({
    name: 'Skyr',
    grams: 150,
  })
  expect(db.foods?.map((f) => f.name).sort()).toEqual([
    'Poulet (filet cru)',
    'Riz basmati (cuit)',
    'Skyr',
  ])
  expect(db.recipes).toHaveLength(1)
  expect(db.recipe_items).toHaveLength(2)
  expect(db.macro_targets?.[0]).toMatchObject({ kcal: 2100, protein_g: 140 })
})

for (const theme of ['light', 'dark'] as const)
  test(`aucune violation axe (WCAG A/AA, ${theme}) : aperçu d’un plan .md`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('brainy.theme', t), theme)
    await installFakeSupabase(page)
    await openImport(page)
    await expect(page.getByRole('list', { name: 'Contenu du plan' })).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
    ).toEqual([])
  })
