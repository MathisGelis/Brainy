import type { Goal } from '@/features/goals/types'
import type { SavingsGoal } from '@/features/savings/types'
import { readXlsx } from '@/lib/xlsx'
import { planFixture } from './__fixtures__/fixture'
import { parsePlanWorkbook } from './importPlan'
import { importRows } from './importRows'

const savings = (name: string): SavingsGoal => ({
  id: `s-${name}`,
  name,
  target_cents: 100,
  goal_id: null,
  archived: false,
  position: 0,
  created_at: '',
})

describe('importRows', () => {
  it('relie les ids entre tables, les cagnottes existantes, et crée les cagnottes en euros manquantes', async () => {
    const plan = parsePlanWorkbook(await readXlsx(planFixture()))
    const existingGoal = { title: 'Résidence permanente' } as Goal
    const rows = importRows(
      plan,
      { savings: [savings('Livret A')], goals: [existingGoal], savingsCount: 1 },
      { createSavings: true, today: '2026-10-26' },
    )

    expect(rows.periods).toHaveLength(3)
    const periodIds = new Set(rows.periods.map((p) => p.id))
    expect(rows.lines.every((l) => periodIds.has(l.period_id))).toBe(true)
    expect(rows.bonuses.every((b) => periodIds.has(b.period_id))).toBe(true)

    const byName = Object.fromEntries(rows.envelopes.map((e) => [e.name, e]))
    // « Livret A » existe déjà : reliée sans créer de doublon
    expect(byName['Livret A / Matelas €']!.savings_id).toBe('s-Livret A')
    // assurance-vie en euros : cagnotte créée avec la cible la plus haute
    expect(rows.savings.map((s) => [s.name, s.target_cents, s.position])).toEqual([
      ['Assurance-vie', 5000, 1],
    ])
    expect(byName['Assurance-vie']!.savings_id).toBe(rows.savings[0]!.id)
    // en dollars, ou sans objectif (valeur du condo) : pas de cagnotte
    expect(byName['CELIAPP']!.savings_id).toBeNull()
    expect(byName['Valeur condo']!.savings_id).toBeNull()

    const envelopeIds = new Set(rows.envelopes.map((e) => e.id))
    expect(
      rows.targets.every((t) => envelopeIds.has(t.envelope_id) && periodIds.has(t.period_id)),
    ).toBe(true)

    // objectif déjà présent ignoré ; horizon d'après l'échéance ; statut repris
    expect(rows.goals.map((g) => [g.title, g.horizon, g.status])).toEqual([
      ['Ouvrir une assurance-vie', 'short', 'achieved'],
      ['Atteindre 10 000€ de base', 'long', 'active'],
    ])
  })

  it('sans création de cagnottes, les enveloppes non reliées restent libres', async () => {
    const plan = parsePlanWorkbook(await readXlsx(planFixture()))
    const rows = importRows(
      plan,
      { savings: [], goals: [], savingsCount: 0 },
      { createSavings: false, today: '2026-10-26' },
    )
    expect(rows.savings).toEqual([])
    expect(rows.envelopes.every((e) => e.savings_id === null)).toBe(true)
  })
})
