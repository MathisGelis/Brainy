import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installFakeSupabase } from './fakeSupabase'

const FIXTURE = 'src/features/plan/__fixtures__/plan-fictif.xlsx'

test('plan financier : importer le classeur, puis une prime reçue devient un revenu', async ({
  page,
}) => {
  const db = await installFakeSupabase(page, {
    goals: [
      {
        id: 'g0',
        title: 'Résidence permanente',
        description: null,
        horizon: 'long',
        target_date: null,
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
  })
  await page.goto('#/budget')
  await page.getByRole('link', { name: 'Plan financier →' }).click()
  await expect(page.getByRole('heading', { name: 'Importer ton plan' })).toBeVisible()

  await page.getByLabel('Classeur Excel du plan').setInputFiles(FIXTURE)
  const summary = page.getByRole('list', { name: 'Contenu du classeur' })
  await expect(summary).toContainText('3 périodes')
  await expect(summary).toContainText('3 objectifs clés (1 déjà dans Objectifs)')
  await page.getByRole('button', { name: 'Importer', exact: true }).click()

  await expect(page.getByText(/^Plan importé : 3 périodes, 2 objectifs ajoutés/)).toBeVisible()
  await expect.poll(() => db.plan_periods?.length).toBe(3)
  expect(db.plan_lines).toHaveLength(12)
  expect(db.goals).toHaveLength(3)
  // cagnotte en euros créée pour l'assurance-vie et le livret
  expect(db.savings_goals?.map((s) => s.name).sort()).toEqual([
    'Assurance-vie',
    'Livret A / Matelas €',
  ])

  // la période qui vient, ses postes et sa prime
  await expect(page.getByRole('combobox', { name: 'Période affichée' })).toContainText(
    '2026 (Nov-Déc)',
  )
  await expect(page.getByLabel('Montant prévu par mois pour « Loyer »')).toHaveValue('700')
  await page.getByRole('button', { name: 'Marquer comme reçue : « Prime de fin d’année »' }).click()
  await page.getByLabel('Montant reçu').fill('480')
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByText(/^Reçu 480/)).toBeVisible()
  await expect.poll(() => db.incomes?.[0]?.amount_cents).toBe(48000)
  expect(db.incomes![0]!.note).toBe('Prime : Prime de fin d’année')

  // un montant prévu se modifie sur place
  const loyer = page.getByLabel('Montant prévu par mois pour « Loyer »')
  await loyer.fill('720,50')
  await loyer.blur()
  await expect
    .poll(() => db.plan_lines?.find((l) => l.label === 'Loyer')?.monthly_cents)
    .toBe(72050)

  // trajectoire : les trois périodes, et le détail d'une autre au clic
  await page.getByRole('button', { name: 'Voir la période 2028 Canada (Mai-Déc)' }).click()
  await expect(page.getByRole('combobox', { name: 'Période affichée' })).toContainText(
    '2028 Canada',
  )
  await expect(page.getByLabel('Montant prévu par mois pour « Loyer Montréal »')).toBeVisible()
})

test('classeur illisible : message clair, rien n’est importé', async ({ page }) => {
  const db = await installFakeSupabase(page)
  await page.goto('#/plan')
  await page.getByLabel('Classeur Excel du plan').setInputFiles({
    name: 'notes.xlsx',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('pas un classeur'),
  })
  await expect(page.getByRole('alert')).toContainText('pas un classeur Excel')
  expect(db.plan_periods ?? []).toHaveLength(0)
})

for (const theme of ['light', 'dark'] as const)
  test(`aucune violation axe (WCAG A/AA, ${theme}) : plan financier importé`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('brainy.theme', t), theme)
    await installFakeSupabase(page)
    await page.goto('#/plan')
    await page.getByLabel('Classeur Excel du plan').setInputFiles(FIXTURE)
    await page.getByRole('button', { name: 'Importer', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Trajectoire d’épargne' })).toBeVisible()
    await expect(page.locator('.animate-pulse')).toHaveCount(0)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
    ).toEqual([])
  })
