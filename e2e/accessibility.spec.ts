import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installFakeSupabase, parisToday } from './fakeSupabase'

const seed = {
  todos: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      list_id: null,
      title: 'Payer le loyer',
      done: false,
      done_at: null,
      due_date: parisToday(),
      focus_on: parisToday(),
      priority: 'high',
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
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
  notes: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      title: 'Idées',
      content: '# Titre\n\n- un\n- deux',
      pinned: true,
      tags: ['perso'],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  day_checkins: [{ id: 'c1', day: parisToday(), mood: 4, energy: 3, win: 'Dossier rendu' }],
  savings_goals: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      name: 'Vacances',
      target_cents: 150000,
      goal_id: '55555555-5555-4555-8555-555555555555',
      archived: false,
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  savings_moves: [
    {
      id: '77777777-7777-4777-8777-777777777777',
      savings_id: '66666666-6666-4666-8666-666666666666',
      amount_cents: 60000,
      moved_on: parisToday(),
      note: null,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  foods: [
    {
      id: '88888888-8888-4888-8888-888888888888',
      name: 'Riz blanc (cuit)',
      kcal: 130,
      protein_dg: 27,
      carbs_dg: 280,
      fat_dg: 3,
      portion_g: null,
      portion_label: null,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  meal_items: [
    {
      id: '99999999-9999-4999-8999-999999999999',
      day: parisToday(),
      meal: 'lunch',
      food_id: '88888888-8888-4888-8888-888888888888',
      name: 'Riz blanc (cuit)',
      grams: 200,
      kcal: 260,
      protein_dg: 54,
      carbs_dg: 560,
      fat_dg: 6,
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  macro_targets: [{ id: 'mt1', kcal: 2000, protein_g: 120, carbs_g: 250, fat_g: 70 }],
  goals: [
    {
      id: '55555555-5555-4555-8555-555555555555',
      title: 'Courir un semi',
      description: null,
      horizon: 'medium',
      target_date: null,
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
}

const pages = [
  { path: '', ready: { role: 'heading', name: "Aujourd'hui" } },
  { path: '#/todo', ready: { role: 'heading', name: 'Todo' } },
  { path: '#/habitudes', ready: { role: 'heading', name: 'Habitudes' } },
  {
    path: '#/habitudes/11111111-1111-4111-8111-111111111111',
    ready: { role: 'textbox', name: "Nom de l'habitude" },
  },
  { path: '#/budget', ready: { role: 'heading', name: 'Budget' } },
  {
    path: '#/notes/44444444-4444-4444-8444-444444444444',
    ready: { role: 'textbox', name: 'Titre de la note' },
  },
  { path: '#/objectifs', ready: { role: 'heading', name: 'Objectifs' } },
  { path: '#/revue', ready: { role: 'heading', name: 'Revue de la semaine' } },
  { path: '#/rituel', ready: { role: 'heading', name: 'Rituel du soir' } },
  { path: '#/calendrier', ready: { role: 'heading', name: 'Calendrier' } },
  { path: '#/semaine', ready: { role: 'heading', name: 'Planifier la semaine' } },
  { path: '#/menu', ready: { role: 'heading', name: 'Menu' } },
] as const

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21aa']

for (const theme of ['light', 'dark'] as const)
  for (const { path, ready } of pages) {
    test(`aucune violation axe (WCAG A/AA, ${theme}) : ${path || 'accueil'}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('cockpit.theme', t), theme)
      await installFakeSupabase(page, seed)
      await page.goto(path)
      await expect(
        page.getByRole(ready.role, { name: ready.name, exact: true }).first(),
      ).toBeVisible()
      // données chargées : plus aucun squelette
      await expect(page.locator('.animate-pulse')).toHaveCount(0)

      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
      ).toEqual([])
    })
  }

test('aucune violation axe (WCAG A/AA) : connexion', async ({ page }) => {
  await page.goto('#/connexion')
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(results.violations.map((v) => v.id)).toEqual([])
})

test('aucune violation axe (WCAG A/AA) : palette de commandes ouverte', async ({ page }) => {
  await installFakeSupabase(page, seed)
  await page.goto('')
  await expect(page.getByRole('heading', { name: "Aujourd'hui", level: 1 })).toBeVisible()
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Rechercher ou créer' }).fill('loyer')
  await expect(page.getByRole('option').first()).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
  ).toEqual([])
})
