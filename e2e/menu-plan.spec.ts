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

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${iso}T12:00:00Z`),
  )

async function addPlan(page: Page, name: string, content: string) {
  await page.getByLabel('Fichier du plan de repas').setInputFiles({
    name,
    mimeType: 'text/markdown',
    buffer: Buffer.from(content),
  })
}

async function openPlans(page: Page) {
  await page.goto('#/menu')
  await page.getByText('Plans de repas', { exact: true }).click()
}

async function pick(page: Page, monday: string, option: string) {
  await page.getByRole('combobox', { name: `Plan de la semaine du ${fmt(monday)}` }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test('menu : ajouter un plan .md puis le suivre la semaine prochaine', async ({ page }) => {
  const next = monday(1)
  const meal = (id: string, plan_id: string | null) => ({
    id,
    day: next,
    meal: 'lunch',
    food_id: null,
    recipe_id: null,
    name: id,
    grams: 100,
    kcal: 500,
    protein_dg: 0,
    carbs_dg: 0,
    fat_dg: 0,
    plan_id,
    eaten: false,
    position: 0,
    created_at: '2026-01-01T00:00:00Z',
  })
  // un repas posé par un ancien plan (remplacé) et un ajout à la main (gardé)
  const db = await installFakeSupabase(page, {
    meal_items: [meal('Ancien plan', 'old-plan'), meal('À la main', null)],
  })
  await openPlans(page)
  await addPlan(page, 'plan.md', PLAN)

  const summary = page.getByRole('list', { name: 'Contenu du plan' })
  await expect(summary).toContainText('2 jours de repas')
  await expect(summary).toContainText('1 recette')
  await expect(summary).toContainText('3 aliments ajoutés')
  await expect(summary).toContainText('Objectifs : 2100 kcal, P 140 g')
  await expect(page.getByRole('alert')).toContainText('aliment inconnu « Zorglub »')
  await page.getByLabel('Nom du plan').fill('Sèche')
  await page.getByRole('button', { name: 'Ajouter aux plans' }).click()

  await expect(page.getByText('Plan « Sèche » ajouté : choisissez ses semaines')).toBeVisible()
  await expect.poll(() => db.meal_plans?.length).toBe(1)
  expect(db.foods?.map((f) => f.name).sort()).toEqual([
    'Poulet (filet cru)',
    'Riz basmati (cuit)',
    'Skyr',
  ])
  expect(db.recipes).toHaveLength(1)
  expect(db.recipe_items).toHaveLength(2)
  expect(db.macro_targets?.[0]).toMatchObject({ kcal: 2100, protein_g: 140 })
  expect(db.meal_items).toHaveLength(2) // rien posé tant qu'aucune semaine n'est choisie

  await pick(page, next, 'Sèche')
  await expect(page.getByText(`Semaine du ${fmt(next)} : 3 repas prévus`)).toBeVisible()
  await expect.poll(() => db.meal_items?.length).toBe(4)
  const names = db.meal_items!.map((m) => m.name).sort()
  expect(names).toEqual(['Poulet riz', 'Skyr', 'Soupe maison', 'À la main'])
  const lunch = db.meal_items!.find((m) => m.name === 'Poulet riz')!
  expect(lunch).toMatchObject({ day: next, grams: 350, kcal: 440, position: 1, eaten: false })
  expect(lunch.plan_id).toBe(db.meal_plans![0]!.id)
  expect(db.meal_items!.find((m) => m.name === 'Soupe maison')!.day).toBe(plusDays(next, 3))
  expect(db.meal_plan_weeks).toEqual([
    expect.objectContaining({ monday: next, plan_id: db.meal_plans![0]!.id, week_type: null }),
  ])
  expect(db.foods).toHaveLength(3) // les aliments du fichier ne sont pas recréés
})

for (const theme of ['light', 'dark'] as const)
  test(`aucune violation axe (WCAG A/AA, ${theme}) : aperçu et plans de la semaine`, async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem('brainy.theme', t), theme)
    await installFakeSupabase(page, {
      meal_plans: [{ id: 'p1', name: 'Sèche', content: PLAN, created_at: '' }],
    })
    await openPlans(page)
    await addPlan(page, 'plan.md', PLAN)
    await expect(page.getByRole('list', { name: 'Contenu du plan' })).toBeVisible()
    await expect(
      page.getByRole('combobox', { name: `Plan de la semaine du ${fmt(monday(0))}` }),
    ).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
    ).toEqual([])
  })

test('menu : deux plans, semaine A puis B choisies une par une, puis aucun plan', async ({
  page,
}) => {
  const AB = `## Semaine A
### Lundi
- Déjeuner : Plat A (500 kcal, P 30, G 50, L 15)
## Semaine B
### Lundi
- Déjeuner : Plat B (600 kcal, P 35, G 60, L 20)
`
  const db = await installFakeSupabase(page, {
    meal_plans: [{ id: 'p1', name: 'Sèche', content: PLAN, created_at: '2026-01-01T00:00:00Z' }],
  })
  await openPlans(page)
  await addPlan(page, 'ab.md', AB)
  await page.getByRole('button', { name: 'Ajouter aux plans' }).click()
  await expect.poll(() => db.meal_plans?.length).toBe(2)

  const w1 = monday(1)
  const w2 = monday(2)
  await pick(page, w1, 'ab · Semaine A')
  await expect.poll(() => db.meal_items?.length).toBe(1)
  await pick(page, w2, 'ab · Semaine B')
  await expect.poll(() => db.meal_items?.length).toBe(2)
  expect(Object.fromEntries(db.meal_items!.map((m) => [m.day, m.name]))).toEqual({
    [w1]: 'Plat A',
    [w2]: 'Plat B',
  })
  // changer de plan remplace les repas posés par l'ancien
  await pick(page, w2, 'Sèche')
  await expect.poll(() => db.meal_items?.some((m) => m.day === w2 && m.plan_id === 'p1')).toBe(true)
  expect(db.meal_items!.some((m) => m.name === 'Plat B')).toBe(false)
  await pick(page, w2, 'Aucun plan')
  await expect.poll(() => db.meal_items?.filter((m) => m.day === w2).length).toBe(0)
  expect(db.meal_items).toHaveLength(1)
  expect(db.meal_plan_weeks?.map((w) => [w.monday, w.week_type])).toEqual([[w1, 'A']])
})
