import { expect, test } from '@playwright/test'
import { installFakeSupabase, parisToday } from './fakeSupabase'

test('ajouter une todo au clavier, la retrouver après rechargement', async ({ page }) => {
  const db = await installFakeSupabase(page)
  await page.goto('#/todo')

  const input = page.getByLabel('Nouvelle todo')
  await input.fill('Acheter du pain')
  await input.press('Enter')
  await input.fill('Appeler Léa')
  await input.press('Enter')

  const list = page.getByRole('list')
  await expect(list.getByRole('button', { name: 'Acheter du pain', exact: true })).toBeVisible()
  await expect(list.getByRole('button', { name: 'Appeler Léa', exact: true })).toBeVisible()
  await expect(input).toBeFocused()
  await expect.poll(() => db.todos?.map((t) => t.title)).toEqual(['Acheter du pain', 'Appeler Léa'])

  await page.reload()
  await expect(page.getByRole('button', { name: 'Appeler Léa', exact: true })).toBeVisible()
})

test("cocher une habitude depuis « Aujourd'hui »", async ({ page }) => {
  const db = await installFakeSupabase(page, {
    habits: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Lecture',
        target_per_week: 7,
        archived: false,
        position: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  })
  await page.goto('')

  const box = page.getByRole('checkbox', { name: "Lecture fait aujourd'hui" })
  await box.click()
  await expect(box).toBeChecked()
  await expect.poll(() => db.habit_logs?.map((l) => l.day)).toEqual([parisToday()])

  await page.getByRole('link', { name: 'Habitudes' }).first().click()
  await expect(page.getByText('Série : 1 jour')).toBeVisible()
})

test('saisir une dépense en centimes et voir le reste du mois', async ({ page }) => {
  const db = await installFakeSupabase(page, {
    expense_categories: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Courses',
        color: null,
        monthly_budget_cents: 30000,
        position: 0,
        archived: false,
      },
    ],
  })
  await page.goto('#/budget')

  await page.getByRole('button', { name: 'Courses' }).click()
  const amount = page.getByLabel('Montant en euros')
  await amount.fill('12,50')
  await amount.press('Enter')

  await expect(page.getByText(/Reste 287,50/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Modifier la dépense de 12,50/ })).toBeVisible()
  await expect
    .poll(() => db.expenses?.map((e) => [e.amount_cents, e.spent_on]))
    .toEqual([[1250, parisToday()]])
})

test('saisie naturelle : todo datée, prioritaire, rangée dans une nouvelle liste', async ({
  page,
}) => {
  const db = await installFakeSupabase(page)
  await page.goto('#/todo')
  const input = page.getByLabel('Nouvelle todo')
  await input.fill('Payer le loyer demain ! #maison')
  await expect(page.getByText('#maison', { exact: true })).toBeVisible() // aperçu
  await input.press('Enter')

  await expect(page.getByRole('button', { name: 'Payer le loyer', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '#maison' })).toBeVisible() // filtre de liste
  await expect.poll(() => db.todo_lists?.map((l) => l.name)).toEqual(['maison'])
  await expect
    .poll(() => db.todos?.map((t) => [t.title, t.priority, t.list_id === db.todo_lists?.[0]?.id]))
    .toEqual([['Payer le loyer', 'high', true]])
})

test('palette Ctrl+K : ajouter une dépense en une phrase', async ({ page }) => {
  const db = await installFakeSupabase(page, {
    expense_categories: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Restaurants',
        color: null,
        monthly_budget_cents: null,
        position: 0,
        archived: false,
      },
    ],
  })
  await page.goto('')
  await expect(page.getByRole('heading', { name: "Aujourd'hui", level: 1 })).toBeVisible()
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Rechercher ou créer' }).fill('12,50 resto')
  await page.getByRole('option', { name: /Ajouter la dépense de 12,50/ }).click()

  await expect(page.getByText('Dépense ajoutée')).toBeVisible()
  await expect
    .poll(() => db.expenses?.map((e) => [e.amount_cents, e.category_id]))
    .toEqual([[1250, '22222222-2222-4222-8222-222222222222']])
})
