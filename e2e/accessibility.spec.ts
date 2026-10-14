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
] as const

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21aa']

for (const { path, ready } of pages) {
  test(`aucune violation axe (WCAG A/AA) : ${path || 'accueil'}`, async ({ page }) => {
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
