import { expect, test } from '@playwright/test'
import { installFakeSupabase, parisToday } from './fakeSupabase'

const todo = {
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  done: false,
  done_at: null,
  priority: 'normal',
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}

test('Top 3 : choisir une suggestion, la retrouver après rechargement', async ({ page }) => {
  const db = await installFakeSupabase(page, {
    todos: [{ ...todo, id: 'a1', title: 'Payer le loyer', due_date: parisToday() }],
  })
  await page.goto('')
  await page.getByRole('button', { name: 'Ajouter « Payer le loyer » au Top 3' }).click()
  const top = page.getByRole('region', { name: 'Top 3 du jour' })
  await expect(top.getByRole('checkbox', { name: 'Terminer « Payer le loyer »' })).toBeVisible()
  await expect.poll(() => db.todos?.[0]?.focus_on).toBe(parisToday())

  await page.reload()
  await expect(top.getByRole('checkbox', { name: 'Terminer « Payer le loyer »' })).toBeVisible()
})

test('humeur et énergie en un geste, une seule saisie par jour', async ({ page }) => {
  const db = await installFakeSupabase(page)
  await page.goto('')
  await page.getByRole('button', { name: 'Humeur : bonne (4 sur 5)' }).click()
  await page.getByRole('button', { name: 'Énergie : moyenne (3 sur 5)' }).click()
  await expect
    .poll(() => db.day_checkins)
    .toEqual([expect.objectContaining({ day: parisToday(), mood: 4, energy: 3 })])

  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Humeur : bonne (4 sur 5)', pressed: true }),
  ).toBeVisible()
})

test('cagnotte : créer, verser, et voir l’épargne déduite du solde', async ({ page }) => {
  const db = await installFakeSupabase(page, {
    incomes: [
      {
        id: 'i1',
        amount_cents: 200000,
        received_on: parisToday(),
        note: 'Salaire',
        recurring_id: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  })
  await page.goto('#/budget')
  await page.getByLabel('Nom de la nouvelle cagnotte').fill('Vacances')
  await page.getByLabel('Montant cible de la nouvelle cagnotte').fill('1500')
  await page.getByLabel('Montant cible de la nouvelle cagnotte').press('Enter')

  const amount = page.getByLabel('Montant pour « Vacances »')
  await amount.fill('600')
  await amount.press('Enter')
  await expect(page.getByRole('progressbar', { name: 'Cagnotte « Vacances »' })).toHaveAttribute(
    'aria-valuenow',
    '40',
  )
  await expect(page.getByRole('region', { name: 'Synthèse du mois' })).toContainText(
    /Épargne 600,00\s€ · Solde \+1\s400,00\s€/,
  )
  await expect.poll(() => db.savings_moves?.map((m) => m.amount_cents)).toEqual([60000])
})

test('calendrier : ajouter une todo à une date depuis le détail du jour', async ({ page }) => {
  const db = await installFakeSupabase(page)
  await page.goto('#/calendrier')
  const today = page.getByRole('button', { pressed: true }).and(page.locator('[data-day]'))
  await today.focus()
  await page.keyboard.press('ArrowRight')
  const detail = page.getByRole('region', { name: /· Demain$/ })
  await expect(detail).toBeVisible()
  const input = detail.getByLabel(/^Nouvelle todo pour le/)
  await input.fill('Appeler le notaire')
  await input.press('Enter')
  await expect(
    detail.getByRole('checkbox', { name: 'Terminer « Appeler le notaire »' }),
  ).toBeVisible()

  const tomorrow = new Date(`${parisToday()}T12:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  await expect.poll(() => db.todos?.[0]?.due_date).toBe(tomorrow.toISOString().slice(0, 10))
})

test('rituel du soir : trois gestes puis retour à l’accueil', async ({ page }) => {
  await installFakeSupabase(page, {
    todos: [{ ...todo, id: 'r1', title: 'Répondre à Paul', due_date: parisToday() }],
  })
  await page.goto('#/rituel')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: 'Demain' }).click()
  await expect(page.getByText("Tout est bouclé pour aujourd'hui.")).toBeVisible()
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: 'Ajouter « Répondre à Paul » au Top 3' }).click()
  await page.getByRole('button', { name: 'Terminer' }).click()
  await expect(page.getByRole('heading', { name: "Aujourd'hui", exact: true })).toBeVisible()
  await expect(page.getByText('Journée bouclée. Bonne soirée !')).toBeVisible()
})
