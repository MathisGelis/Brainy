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
  /** Règle récurrente qui l'a générée, le cas échéant */
  recurring_id: string | null
  created_at: string
}

export type Income = {
  id: string
  amount_cents: number
  received_on: string
  note: string | null
  recurring_id: string | null
  created_at: string
}

export type IncomePatch = Partial<Pick<Income, 'amount_cents' | 'received_on' | 'note'>>

export type EntryKind = 'expense' | 'income'

/** Règle mensuelle (loyer, abonnement, salaire…) qui génère dépenses ou revenus. */
export type RecurringEntry = {
  id: string
  kind: EntryKind
  amount_cents: number
  category_id: string | null
  note: string | null
  day_of_month: number
  start_on: string
  last_generated_on: string | null
  active: boolean
  created_at: string
}

export type RecurringPatch = Partial<
  Pick<
    RecurringEntry,
    'amount_cents' | 'category_id' | 'note' | 'day_of_month' | 'active' | 'last_generated_on'
  >
>

export type ExpensePatch = Partial<
  Pick<Expense, 'category_id' | 'amount_cents' | 'spent_on' | 'note' | 'recurring_id'>
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
