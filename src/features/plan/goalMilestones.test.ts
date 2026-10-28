import { goalMilestones, targetCents } from './goalMilestones'
import type { ImportedGoal, ImportedPeriod, PlanImport } from './importPlan'

const period = (over: Partial<ImportedPeriod>): ImportedPeriod => ({
  sheet: '',
  label: '',
  start_month: '2031-01-01',
  end_month: '2031-12-01',
  currency: 'CAD',
  savings_target_cents: null,
  age_label: null,
  notes: null,
  journal: [],
  lines: [],
  bonuses: [],
  envelopes: [],
  ...over,
})
const goal = (
  title: string,
  target_date: string | null,
  target_label: string | null = null,
): ImportedGoal => ({
  title,
  target_date,
  target_label,
  description: null,
  achieved: false,
})

describe('targetCents', () => {
  it('lit un montant en €, en CAD ou en milliers ; ignore les points de score', () => {
    expect(targetCents('15 000€')).toBe(1_500_000)
    expect(targetCents('40 000 CAD')).toBe(4_000_000)
    expect(targetCents('60k CAD apport')).toBe(6_000_000)
    expect(targetCents('700 pts')).toBeNull()
    expect(targetCents(null)).toBeNull()
  })
})

describe('goalMilestones', () => {
  const plan: PlanImport = {
    envelopes: [{ name: 'CELIAPP', currency: 'CAD' }],
    goals: [],
    periods: [
      period({
        start_month: '2030-01-01',
        end_month: '2030-12-01',
        envelopes: [{ name: 'CELIAPP', target_cents: 1_000_000 }],
        journal: [
          {
            label: 'Mars 2030',
            month: '2030-03-01',
            text: 'Pré-qualification hypothécaire chez Desjardins',
          },
        ],
      }),
      period({
        envelopes: [{ name: 'CELIAPP', target_cents: 4_000_000 }],
        journal: [{ label: 'Juin 2031', month: '2031-06-01', text: 'Visiter des condos à Verdun' }],
        bonuses: [
          {
            label: 'Achat condo',
            planned_cents: 0,
            expected_month: '2031-09-01',
            expected_label: null,
            received_cents: null,
            received_on: null,
          },
        ],
      }),
    ],
  }

  it('suit la trajectoire de l’enveloppe nommée, jusqu’à l’échéance', () => {
    expect(goalMilestones(goal('CELIAPP plafonné', '2030-12-31'), plan)).toEqual([
      expect.stringMatching(/^CELIAPP : 10\s000\s\$ fin décembre 2030$/),
    ])
  })

  it('reprend journal et primes qui en parlent, sans la ligne qui redit l’objectif', () => {
    expect(goalMilestones(goal('Achat condo', '2031-12-31'), plan)).toEqual([
      'Visiter des condos à Verdun (Juin 2031)',
    ])
  })

  it('aucun jalon plutôt que des jalons hors sujet', () => {
    expect(goalMilestones(goal('Apprendre le piano', null), plan)).toEqual([])
  })
})
