import type { Expense, Income } from '@/features/budget/types'
import { addMonthsClamped } from '@/lib/naturalDate'
import type { Currency, PlanBonus, PlanEnvelopeTarget, PlanLine, PlanPeriod } from './types'

/** « 2027-03-15 » → « 2027-03-01 » */
export const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`
export const nextMonth = (month: string) => addMonthsClamped(month, 1, 1)

/** Premiers jours des mois d'une période, du premier au dernier. */
export function periodMonths(p: Pick<PlanPeriod, 'start_month' | 'end_month'>): string[] {
  const out: string[] = []
  for (let m = p.start_month; m <= p.end_month && out.length < 240; m = nextMonth(m)) out.push(m)
  return out
}

export const lineActive = (l: PlanLine, month: string) =>
  (!l.first_month || month >= l.first_month) && (!l.last_month || month <= l.last_month)

export type MonthFigures = { income: number; expense: number; surplus: number }

/** Prévu d'un mois : somme des postes actifs ce mois-là. */
export function plannedMonth(lines: PlanLine[], month: string): MonthFigures {
  let income = 0
  let expense = 0
  for (const l of lines) {
    if (!lineActive(l, month)) continue
    if (l.kind === 'income') income += l.monthly_cents
    else expense += l.monthly_cents
  }
  return { income, expense, surplus: income - expense }
}

/** Réel d'un mois, depuis les revenus et dépenses de l'app (primes reçues comprises). */
export function realMonth(incomes: Income[], expenses: Expense[], month: string): MonthFigures {
  const key = month.slice(0, 7)
  const income = incomes
    .filter((i) => i.received_on.startsWith(key))
    .reduce((s, i) => s + i.amount_cents, 0)
  const expense = expenses
    .filter((e) => e.spent_on.startsWith(key))
    .reduce((s, e) => s + e.amount_cents, 0)
  return { income, expense, surplus: income - expense }
}

/** Réel d'un poste de dépense relié à une catégorie, sur un mois. */
export function realOfLine(line: PlanLine, expenses: Expense[], month: string): number | null {
  if (line.kind !== 'expense' || !line.category_id) return null
  const key = month.slice(0, 7)
  return expenses
    .filter((e) => e.category_id === line.category_id && e.spent_on.startsWith(key))
    .reduce((s, e) => s + e.amount_cents, 0)
}

/** Période du mois donné ; sinon la prochaine ; sinon la dernière. */
export function currentPeriod(periods: PlanPeriod[], month: string): PlanPeriod | null {
  const sorted = [...periods].sort((a, b) => a.start_month.localeCompare(b.start_month))
  return (
    sorted.find((p) => p.start_month <= month && month <= p.end_month) ??
    sorted.find((p) => p.start_month > month) ??
    sorted.at(-1) ??
    null
  )
}

export type PeriodStatus = 'past' | 'current' | 'future'

export type PeriodProgress = {
  period: PlanPeriod
  status: PeriodStatus
  /** Mois écoulés (mois en cours compris) */
  elapsed: number
  months: number
  /** Épargne prévue d'après les postes et primes, sur toute la période */
  plannedTotal: number
  /** … et jusqu'au mois en cours compris */
  plannedToDate: number
  /** Surplus réel cumulé jusqu'au mois en cours (revenus − dépenses de l'app) */
  realToDate: number
}

export function periodProgress(
  period: PlanPeriod,
  lines: PlanLine[],
  bonuses: PlanBonus[],
  incomes: Income[],
  expenses: Expense[],
  thisMonth: string,
): PeriodProgress {
  const months = periodMonths(period)
  const own = lines.filter((l) => l.period_id === period.id)
  const ownBonuses = bonuses.filter((b) => b.period_id === period.id)
  const elapsedMonths = months.filter((m) => m <= thisMonth)
  const bonusDue = (upTo: string | null) =>
    ownBonuses
      .filter((b) => upTo === null || (b.expected_month !== null && b.expected_month <= upTo))
      .reduce((s, b) => s + b.planned_cents, 0)

  const plannedTotal = months.reduce((s, m) => s + plannedMonth(own, m).surplus, 0) + bonusDue(null)
  const plannedToDate =
    elapsedMonths.reduce((s, m) => s + plannedMonth(own, m).surplus, 0) + bonusDue(thisMonth)
  const realToDate = elapsedMonths.reduce((s, m) => s + realMonth(incomes, expenses, m).surplus, 0)
  return {
    period,
    status:
      period.end_month < thisMonth ? 'past' : period.start_month > thisMonth ? 'future' : 'current',
    elapsed: elapsedMonths.length,
    months: months.length,
    plannedTotal,
    plannedToDate,
    realToDate,
  }
}

/** Conversion avec le taux du plan (1 € = milli/1000 CAD). */
export function convert(cents: number, from: Currency, to: Currency, eurToCadMilli: number) {
  if (from === to) return cents
  return from === 'EUR'
    ? Math.round((cents * eurToCadMilli) / 1000)
    : Math.round((cents * 1000) / eurToCadMilli)
}

/** Totaux par devise d'une liste de montants. */
export function totalsByCurrency(items: { currency: Currency; cents: number }[]) {
  const out: Record<Currency, number> = { EUR: 0, CAD: 0 }
  for (const i of items) out[i.currency] += i.cents
  return out
}

/** Solde visé d'une enveloppe pour la période donnée (ou la plus proche avant). */
export function envelopeTarget(
  targets: PlanEnvelopeTarget[],
  periods: PlanPeriod[],
  envelopeId: string,
  period: PlanPeriod,
): number | null {
  const byPeriod = new Map(periods.map((p) => [p.id, p]))
  const candidates = targets
    .filter((t) => t.envelope_id === envelopeId)
    .map((t) => ({ t, p: byPeriod.get(t.period_id) }))
    .filter((x): x is { t: PlanEnvelopeTarget; p: PlanPeriod } =>
      Boolean(x.p && x.p.start_month <= period.end_month),
    )
    .sort((a, b) => b.p.start_month.localeCompare(a.p.start_month))
  return candidates[0]?.t.target_cents ?? null
}

const formatters: Record<Currency, Intl.NumberFormat> = {
  EUR: new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }),
  CAD: new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }),
}

/** Montant arrondi à l'unité, dans sa devise : « 1 248 $ », « 15 000 € ». */
export const formatMoney = (cents: number, currency: Currency) =>
  formatters[currency].format(Math.round(cents / 100))
