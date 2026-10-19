import {
  categoryTrends,
  dueOccurrences,
  nextOccurrenceOf,
  occurrenceIn,
  projectMonthEnd,
} from './recurringLogic'
import type { Expense, RecurringEntry } from './types'

const rule = (overrides: Partial<RecurringEntry> = {}): RecurringEntry => ({
  id: 'r1',
  kind: 'expense',
  amount_cents: 90000,
  category_id: null,
  note: 'Loyer',
  day_of_month: 5,
  start_on: '2026-08-01',
  last_generated_on: null,
  active: true,
  created_at: '2026-08-01T00:00:00Z',
  ...overrides,
})

const exp = (cents: number, day: string, extra: Partial<Expense> = {}): Expense => ({
  id: Math.random().toString(),
  category_id: 'c1',
  amount_cents: cents,
  spent_on: day,
  note: null,
  recurring_id: null,
  created_at: '',
  ...extra,
})

describe('dueOccurrences', () => {
  it('rattrape les mois manqués jusqu’à aujourd’hui', () => {
    expect(dueOccurrences(rule(), '2026-10-14')).toEqual(['2026-08-05', '2026-09-05', '2026-10-05'])
  })

  it('ne régénère rien après la dernière occurrence générée', () => {
    expect(dueOccurrences(rule({ last_generated_on: '2026-10-05' }), '2026-10-14')).toEqual([])
    expect(dueOccurrences(rule({ last_generated_on: '2026-09-05' }), '2026-10-14')).toEqual([
      '2026-10-05',
    ])
  })

  it('n’anticipe pas : le jour n’est pas encore arrivé', () => {
    expect(
      dueOccurrences(rule({ day_of_month: 20, last_generated_on: '2026-09-20' }), '2026-10-14'),
    ).toEqual([])
  })

  it('respecte la date de début (règle créée après le jour du mois)', () => {
    expect(dueOccurrences(rule({ start_on: '2026-10-14' }), '2026-10-14')).toEqual([])
  })

  it('borne le jour aux mois courts', () => {
    expect(occurrenceIn('2026-02', 31)).toBe('2026-02-28')
    expect(
      dueOccurrences(rule({ day_of_month: 31, start_on: '2026-02-01' }), '2026-03-01'),
    ).toEqual(['2026-02-28'])
  })

  it('ignore une règle en pause', () => {
    expect(dueOccurrences(rule({ active: false }), '2026-10-14')).toEqual([])
  })

  it('prochaine occurrence', () => {
    expect(nextOccurrenceOf(rule(), '2026-10-14')).toBe('2026-11-05')
    expect(nextOccurrenceOf(rule({ day_of_month: 20 }), '2026-10-14')).toBe('2026-10-20')
  })
})

describe('projectMonthEnd', () => {
  it('extrapole les dépenses variables, garde les fixes telles quelles', () => {
    const expenses = [exp(90000, '2026-10-05', { recurring_id: 'r1' }), exp(30000, '2026-10-08')]
    // 300 € variables en 15 jours → 620 € sur 31 jours ; + loyer 900 €
    expect(projectMonthEnd(expenses, [rule()], '2026-10', '2026-10-15')).toBe(90000 + 62000)
  })

  it('ajoute les dépenses récurrentes encore à venir ce mois-ci', () => {
    const netflix = rule({ id: 'r2', amount_cents: 1399, day_of_month: 25 })
    expect(projectMonthEnd([], [netflix], '2026-10', '2026-10-15')).toBe(1399)
  })

  it('pas de projection hors du mois courant ni trop tôt', () => {
    expect(projectMonthEnd([], [], '2026-09', '2026-10-15')).toBeNull()
    expect(projectMonthEnd([], [], '2026-10', '2026-10-02')).toBeNull()
  })
})

describe('categoryTrends', () => {
  it('compare à date égale au mois précédent', () => {
    const current = [exp(12000, '2026-10-10')]
    const previous = [exp(10000, '2026-09-08'), exp(50000, '2026-09-25')] // le 25 est exclu
    expect(categoryTrends(current, previous, '2026-10', '2026-10-14').get('c1')).toBe(20)
  })

  it('null quand le mois précédent est vide', () => {
    expect(
      categoryTrends([exp(100, '2026-10-01')], [], '2026-10', '2026-10-14').get('c1'),
    ).toBeNull()
  })
})
