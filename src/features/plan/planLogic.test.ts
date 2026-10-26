import type { Expense, Income } from '@/features/budget/types'
import {
  convert,
  currentPeriod,
  envelopeTarget,
  formatMoney,
  periodMonths,
  periodProgress,
  plannedMonth,
  realMonth,
  realOfLine,
} from './planLogic'
import type { PlanBonus, PlanLine, PlanPeriod } from './types'

const period = (over: Partial<PlanPeriod>): PlanPeriod => ({
  id: 'p1',
  label: '2027',
  start_month: '2027-01-01',
  end_month: '2027-12-01',
  currency: 'EUR',
  savings_target_cents: null,
  age_label: null,
  notes: null,
  position: 0,
  created_at: '',
  ...over,
})
const line = (over: Partial<PlanLine>): PlanLine => ({
  id: 'l',
  period_id: 'p1',
  kind: 'expense',
  label: 'x',
  monthly_cents: 0,
  first_month: null,
  last_month: null,
  category_id: null,
  position: 0,
  created_at: '',
  ...over,
})
const income = (received_on: string, amount_cents: number): Income => ({
  id: received_on + amount_cents,
  amount_cents,
  received_on,
  note: null,
  recurring_id: null,
  created_at: '',
})
const expense = (
  spent_on: string,
  amount_cents: number,
  category_id: string | null = null,
): Expense => ({
  id: spent_on + amount_cents,
  amount_cents,
  spent_on,
  category_id,
  note: null,
  recurring_id: null,
  created_at: '',
})

const lines = [
  line({ id: 's1', kind: 'income', monthly_cents: 200000, last_month: '2027-06-01' }),
  line({ id: 's2', kind: 'income', monthly_cents: 240000, first_month: '2027-07-01' }),
  line({ id: 'loyer', monthly_cents: 70000, category_id: 'cat-loyer' }),
]

describe('planLogic', () => {
  it('liste les mois d’une période', () => {
    expect(periodMonths(period({ start_month: '2026-11-01', end_month: '2027-02-01' }))).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
      '2027-02-01',
    ])
  })

  it('prévu d’un mois : seuls les postes actifs comptent', () => {
    expect(plannedMonth(lines, '2027-03-01')).toEqual({
      income: 200000,
      expense: 70000,
      surplus: 130000,
    })
    expect(plannedMonth(lines, '2027-09-01')).toEqual({
      income: 240000,
      expense: 70000,
      surplus: 170000,
    })
  })

  it('réel d’un mois et d’un poste relié à une catégorie', () => {
    const exps = [
      expense('2027-03-05', 70000, 'cat-loyer'),
      expense('2027-03-10', 5000),
      expense('2027-04-01', 1000),
    ]
    expect(realMonth([income('2027-03-28', 210000)], exps, '2027-03-01')).toEqual({
      income: 210000,
      expense: 75000,
      surplus: 135000,
    })
    expect(realOfLine(lines[2]!, exps, '2027-03-01')).toBe(70000)
    expect(realOfLine(lines[0]!, exps, '2027-03-01')).toBeNull()
  })

  it('progression d’une période : prévu total, prévu à date (primes échues comprises), réel', () => {
    const bonuses = [
      { id: 'b1', period_id: 'p1', planned_cents: 100000, expected_month: '2027-02-01' },
      { id: 'b2', period_id: 'p1', planned_cents: 50000, expected_month: '2027-12-01' },
    ] as PlanBonus[]
    const prog = periodProgress(
      period({}),
      lines,
      bonuses,
      [income('2027-01-28', 200000), income('2027-02-28', 300000)],
      [expense('2027-01-03', 80000), expense('2027-02-03', 70000)],
      '2027-02-01',
    )
    expect(prog).toMatchObject({
      status: 'current',
      elapsed: 2,
      months: 12,
      plannedTotal: 6 * 130000 + 6 * 170000 + 150000,
      plannedToDate: 2 * 130000 + 100000,
      realToDate: 120000 + 230000,
    })
  })

  it('période en cours, sinon la prochaine, sinon la dernière', () => {
    const ps = [
      period({ id: 'a', start_month: '2026-11-01', end_month: '2026-12-01' }),
      period({ id: 'b' }),
    ]
    expect(currentPeriod(ps, '2026-12-01')?.id).toBe('a')
    expect(currentPeriod(ps, '2026-06-01')?.id).toBe('a')
    expect(currentPeriod(ps, '2030-01-01')?.id).toBe('b')
    expect(currentPeriod([], '2030-01-01')).toBeNull()
  })

  it('cible d’une enveloppe : la période donnée, sinon la plus récente avant', () => {
    const ps = [
      period({ id: 'a', start_month: '2026-11-01', end_month: '2026-12-01' }),
      period({ id: 'b' }),
    ]
    const targets = [{ id: 't', envelope_id: 'e', period_id: 'a', target_cents: 50000 }]
    expect(envelopeTarget(targets, ps, 'e', ps[1]!)).toBe(50000)
    expect(envelopeTarget(targets, ps, 'autre', ps[1]!)).toBeNull()
  })

  it('convertit et affiche dans la devise', () => {
    expect(convert(100000, 'EUR', 'CAD', 1500)).toBe(150000)
    expect(convert(150000, 'CAD', 'EUR', 1500)).toBe(100000)
    expect(formatMoney(1500000, 'EUR')).toMatch(/^15\s000\s€$/)
    expect(formatMoney(124800, 'CAD')).toMatch(/^1\s248\s\$$/)
  })
})
