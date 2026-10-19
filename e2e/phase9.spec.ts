import { expect, test } from '@playwright/test'
import { installFakeSupabase, parisToday } from './fakeSupabase'

const todo = {
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  focus_week: null,
  done: false,
  done_at: null,
  due_date: null,
  priority: 'normal',
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

test('catégorie devinée d’après l’historique', async ({ page }) => {
  const db = await installFakeSupabase(page, {
    expense_categories: [
      {
        id: 'c1',
        name: 'Courses',
        color: null,
        monthly_budget_cents: null,
        position: 0,
        archived: false,
      },
      {
        id: 'c2',
        name: 'Loisirs',
        color: null,
        monthly_budget_cents: null,
        position: 1,
        archived: false,
      },
    ],
    expenses: [
      {
        id: 'e1',
        category_id: 'c1',
        amount_cents: 3000,
        spent_on: shift(parisToday(), -20),
        note: 'Biocoop',
        recurring_id: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  })
  await page.goto('#/budget')
  const amount = page.getByLabel('Montant en euros')
  await amount.fill('45 biocoop')
  await expect(page.getByRole('button', { name: 'Courses', pressed: true })).toBeVisible()
  await expect(page.getByText("· d'après l'historique")).toBeVisible()
  await amount.press('Enter')
  await expect.poll(() => db.expenses?.find((e) => e.amount_cents === 4500)?.category_id).toBe('c1')
})

test('victoire du jour notée dans le rituel du soir, reprise dans la revue', async ({ page }) => {
  const db = await installFakeSupabase(page)
  await page.goto('#/rituel')
  const win = page.getByLabel('Une victoire aujourd’hui ?')
  await win.fill('Dossier rendu à temps')
  await win.press('Enter')
  await expect.poll(() => db.day_checkins?.[0]?.win).toBe('Dossier rendu à temps')

  await page.goto('#/calendrier')
  await expect(page.getByLabel('Une victoire aujourd’hui ?')).toHaveValue('Dossier rendu à temps')
})

test('planifier la semaine : une priorité, une todo placée, puis retour à l’accueil', async ({
  page,
}) => {
  const db = await installFakeSupabase(page, {
    todos: [
      { ...todo, id: 'p1', title: 'Préparer l’entretien', priority: 'high' },
      { ...todo, id: 'p2', title: 'Ranger la cave', position: 1 },
    ],
  })
  await page.goto('#/semaine')
  await expect(page.getByText('Rien ne traîne. Bien joué.')).toBeVisible()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page
    .getByRole('button', { name: 'Ajouter « Préparer l’entretien » aux priorités de la semaine' })
    .click()
  await expect.poll(() => db.todos?.find((t) => t.id === 'p1')?.focus_week).toBeTruthy()
  await page.getByRole('button', { name: 'Suivant' }).click()
  const pills = page.getByRole('group', { name: 'Jour pour « Ranger la cave »' })
  await pills.getByRole('button').last().click() // dimanche
  await expect.poll(() => db.todos?.find((t) => t.id === 'p2')?.due_date).toBeTruthy()
  await page.getByRole('button', { name: 'Terminer' }).click()
  await expect(page.getByText('Semaine planifiée. Bonne semaine !')).toBeVisible()
})
