import { expect, test } from '@playwright/test'
import { installFakeSupabase, parisToday } from './fakeSupabase'

test('événements : un séjour sur plusieurs jours, une série dont on retire un jour', async ({
  page,
}) => {
  const db = await installFakeSupabase(page)
  await page.goto('#/calendrier')
  const detail = page.getByRole('region', { name: /Aujourd'hui$/ })
  const input = detail.getByLabel(/^Nouvel événement pour le/)

  // Séjour du jour même jusqu'au surlendemain
  await input.fill('Déplacement à Lyon pendant 3 jours')
  await input.press('Enter')
  await expect(
    detail.getByRole('button', { name: 'Modifier « Déplacement à Lyon »' }),
  ).toContainText('jour 1/3')
  await expect.poll(() => db.events?.length).toBe(1)
  expect(db.events![0]).toMatchObject({ start_on: parisToday() })

  // Le séjour apparaît dans les cases des jours suivants
  const day2 = new Date(`${parisToday()}T12:00:00Z`)
  day2.setUTCDate(day2.getUTCDate() + 2)
  const iso2 = day2.toISOString().slice(0, 10)
  await expect(page.locator(`[data-day="${iso2}"]`)).toHaveAttribute(
    'aria-label',
    /Déplacement à Lyon/,
  )

  // Une série quotidienne, dont on retire aujourd'hui seulement
  await input.fill('Méditation tous les jours à 7h')
  await input.press('Enter')
  const row = detail.getByRole('button', { name: 'Modifier « Méditation »' })
  await expect(row).toContainText('7h · ↻ Tous les jours')
  await row.click()
  await detail.getByRole('button', { name: 'Supprimer ce jour-là' }).click()
  await expect(row).toHaveCount(0)
  await expect
    .poll(() => db.events?.find((e) => e.title === 'Méditation')?.skipped)
    .toEqual([parisToday()])

  // Toujours là demain, et après rechargement
  await page.reload()
  await page.keyboard.press('Tab')
  await page.locator(`[data-day="${parisToday()}"]`).focus()
  await page.keyboard.press('ArrowRight')
  const tomorrow = page.getByRole('region', { name: /· Demain$/ })
  await expect(tomorrow.getByRole('button', { name: 'Modifier « Méditation »' })).toBeVisible()
})

test('accueil : l’agenda du jour', async ({ page }) => {
  await installFakeSupabase(page, {
    events: [
      {
        id: 'e1',
        title: 'Dentiste',
        start_on: parisToday(),
        end_on: parisToday(),
        start_time: '14:30:00',
        end_time: null,
        note: null,
        repeat: null,
        repeat_every: 1,
        repeat_days: null,
        repeat_until: null,
        skipped: [],
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  })
  await page.goto('')
  const agenda = page.getByRole('region', { name: 'Agenda' })
  await expect(agenda).toContainText('Dentiste')
  await expect(agenda).toContainText('14h30')
})
