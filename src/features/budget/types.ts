export type Category = {
  id: string
  name: string
  color: string | null
  monthly_budget_cents: number | null
  position: number
  archived: boolean
}

export type CategoryPatch = Partial<Pick<Category, 'name' | 'monthly_budget_cents' | 'archived'>>

export type Expense = {
  id: string
  category_id: string | null
  amount_cents: number
  spent_on: string
  note: string | null
  created_at: string
}

export type ExpensePatch = Partial<
  Pick<Expense, 'category_id' | 'amount_cents' | 'spent_on' | 'note'>
>

export type CategorySummary = {
  /** `null` = dépenses sans catégorie */
  category: Category | null
  spent: number
  budget: number | null
  remaining: number | null
  over: boolean
  /** dépensé / budget, plafonné à 1 (0 si pas de budget) */
  ratio: number
}

export type MonthSummary = {
  totalSpent: number
  totalBudget: number
  /** `null` si aucun budget n'est défini */
  remaining: number | null
  over: boolean
  byCategory: CategorySummary[]
}
