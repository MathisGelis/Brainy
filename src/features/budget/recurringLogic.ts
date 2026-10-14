import { addDays, addMonths, monthOf } from '@/lib/dates'
import { daysInMonth } from '@/lib/naturalDate'
import type { Expense, RecurringEntry } from './types'

/** Rattrapage maximal (un appareil resté fermé très longtemps ne génère pas des années d'un coup). */
const MAX_MONTHS = 24

/** Date d'une règle dans un mois donné (jour borné à la fin du mois : 31 → 30, 28…). */
export function occurrenceIn(month: string, dayOfMonth: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return `${month}-${String(Math.min(dayOfMonth, daysInMonth(y, m))).padStart(2, '0')}`
}

/**
 * Occurrences à générer : après la dernière générée (ou à partir du début de la règle),
 * jusqu'à aujourd'hui inclus. Une occurrence supprimée à la main n'est donc jamais recréée.
 */
export function dueOccurrences(rule: RecurringEntry, today: string): string[] {
  if (!rule.active) return []
  const after = rule.last_generated_on ?? addDays(rule.start_on, -1)
  const dates: string[] = []
  let month = monthOf(after > rule.start_on ? after : rule.start_on)
  for (let i = 0; i < MAX_MONTHS && month <= monthOf(today); i++, month = addMonths(month, 1)) {
    const date = occurrenceIn(month, rule.day_of_month)
    if (date > after && date >= rule.start_on && date <= today) dates.push(date)
  }
  return dates
}

/** Prochaine occurrence à venir (strictement après aujourd'hui). */
export function nextOccurrenceOf(rule: RecurringEntry, today: string): string {
  const thisMonth = occurrenceIn(monthOf(today), rule.day_of_month)
  const candidate =
    thisMonth > today ? thisMonth : occurrenceIn(addMonths(monthOf(today), 1), rule.day_of_month)
  return candidate < rule.start_on
    ? occurrenceIn(monthOf(rule.start_on), rule.day_of_month)
    : candidate
}

/**
 * Projection de fin de mois : dépenses fixes (récurrentes déjà passées + à venir ce mois-ci)
 * + dépenses variables extrapolées au rythme actuel. `null` hors du mois courant ou trop tôt (< 3 jours).
 */
export function projectMonthEnd(
  expenses: Expense[],
  rules: RecurringEntry[],
  month: string,
  today: string,
): number | null {
  if (month !== monthOf(today)) return null
  const elapsed = Number(today.slice(8))
  if (elapsed < 3) return null
  const [y, m] = month.split('-').map(Number) as [number, number]
  const days = daysInMonth(y, m)

  const fixed = expenses.filter((e) => e.recurring_id).reduce((sum, e) => sum + e.amount_cents, 0)
  const variable = expenses
    .filter((e) => !e.recurring_id)
    .reduce((sum, e) => sum + e.amount_cents, 0)
  const upcoming = rules
    .filter((r) => r.active && r.kind === 'expense')
    .filter((r) => {
      const date = occurrenceIn(month, r.day_of_month)
      return date > today && date >= r.start_on
    })
    .reduce((sum, r) => sum + r.amount_cents, 0)

  return fixed + upcoming + Math.round((variable / elapsed) * days)
}

/**
 * Variation par catégorie par rapport au mois précédent, à date égale pour le mois en cours
 * (le 14 octobre se compare au 1–14 septembre). `null` quand le mois précédent est vide.
 */
export function categoryTrends(
  current: Expense[],
  previous: Expense[],
  month: string,
  today: string,
): Map<string | null, number | null> {
  const cutoffDay = month === monthOf(today) ? Number(today.slice(8)) : 31
  const sumBy = (list: Expense[]) => {
    const map = new Map<string | null, number>()
    for (const e of list) map.set(e.category_id, (map.get(e.category_id) ?? 0) + e.amount_cents)
    return map
  }
  const now = sumBy(current)
  const before = sumBy(previous.filter((e) => Number(e.spent_on.slice(8)) <= cutoffDay))
  const trends = new Map<string | null, number | null>()
  for (const key of new Set([...now.keys(), ...before.keys()])) {
    const a = now.get(key) ?? 0
    const b = before.get(key) ?? 0
    trends.set(key, b === 0 ? null : Math.round(((a - b) / b) * 100))
  }
  return trends
}
