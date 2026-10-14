import type { Category, Expense } from '@/features/budget/types'
import { toCSV } from '@/lib/csv'
import { centsToInput } from '@/lib/money'

/** Dépenses en CSV lisible : date, montant en euros (virgule décimale), catégorie, note. */
export function expensesToCSV(expenses: Expense[], categories: Category[]): string {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const rows = [...expenses]
    .sort(
      (a, b) => a.spent_on.localeCompare(b.spent_on) || a.created_at.localeCompare(b.created_at),
    )
    .map((e) => [
      e.spent_on,
      centsToInput(e.amount_cents),
      e.category_id ? (names.get(e.category_id) ?? '') : '',
      e.note,
    ])
  return toCSV(['date', 'montant_eur', 'categorie', 'note'], rows)
}
