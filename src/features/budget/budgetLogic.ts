import type { Category, CategorySummary, Expense, MonthSummary } from './types'

export const DEFAULT_CATEGORIES = [
  'Courses',
  'Restaurants',
  'Transport',
  'Logement',
  'Loisirs',
  'Santé',
  'Abonnements',
  'Autre',
]

/** Synthèse d'un mois : totaux et détail par catégorie (calculs en centimes entiers). */
export function summarizeMonth(categories: Category[], expenses: Expense[]): MonthSummary {
  const spentBy = new Map<string | null, number>()
  for (const e of expenses) {
    spentBy.set(e.category_id, (spentBy.get(e.category_id) ?? 0) + e.amount_cents)
  }

  const summarize = (category: Category | null): CategorySummary => {
    const spent = spentBy.get(category?.id ?? null) ?? 0
    const budget = category?.monthly_budget_cents ?? null
    const remaining = budget === null ? null : budget - spent
    return {
      category,
      spent,
      budget,
      remaining,
      over: remaining !== null && remaining < 0,
      ratio: budget ? Math.min(1, spent / budget) : 0,
    }
  }

  const known = new Set(categories.map((c) => c.id))
  const byCategory = categories
    // une catégorie archivée reste visible si elle a des dépenses ce mois-ci
    .filter((c) => !c.archived || (spentBy.get(c.id) ?? 0) > 0)
    .sort((a, b) => a.position - b.position)
    .map(summarize)

  // dépenses sans catégorie, ou dont la catégorie a disparu
  const orphanSpent = expenses
    .filter((e) => e.category_id === null || !known.has(e.category_id))
    .reduce((sum, e) => sum + e.amount_cents, 0)
  if (orphanSpent > 0) {
    byCategory.push({
      category: null,
      spent: orphanSpent,
      budget: null,
      remaining: null,
      over: false,
      ratio: 0,
    })
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount_cents, 0)
  const totalBudget = categories
    .filter((c) => !c.archived)
    .reduce((sum, c) => sum + (c.monthly_budget_cents ?? 0), 0)
  const remaining = totalBudget > 0 ? totalBudget - totalSpent : null

  return {
    totalSpent,
    totalBudget,
    remaining,
    over: remaining !== null && remaining < 0,
    byCategory,
  }
}
