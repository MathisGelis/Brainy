import { monthBounds } from '@/lib/dates'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type {
  Category,
  CategoryPatch,
  Expense,
  ExpensePatch,
  Income,
  IncomePatch,
  RecurringEntry,
  RecurringPatch,
} from './types'

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('position')
    .order('name')
  if (error) throw error
  return data as Category[]
}

export async function insertCategories(categories: Category[]): Promise<void> {
  const { error } = await supabase.from('expense_categories').insert(categories)
  if (error) throw error
}

export async function patchCategory(id: string, patch: CategoryPatch): Promise<void> {
  const { error } = await supabase.from('expense_categories').update(patch).eq('id', id)
  if (error) throw error
}

/** Dépenses d'un mois `YYYY-MM`, les plus récentes d'abord. */
export async function fetchExpenses(month: string): Promise<Expense[]> {
  const { from, to } = monthBounds(month)
  return fetchAllRows<Expense>((start, end) =>
    supabase
      .from('expenses')
      .select('*')
      .gte('spent_on', from)
      .lt('spent_on', to)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id')
      .range(start, end),
  )
}

export async function insertExpense(expense: Expense): Promise<void> {
  const { error } = await supabase.from('expenses').insert(expense)
  if (error) throw error
}

export async function patchExpense(id: string, patch: ExpensePatch): Promise<void> {
  const { error } = await supabase.from('expenses').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

/** Supprime la catégorie ; ses dépenses restent (category_id passe à null côté base). */
export async function removeCategory(id: string): Promise<void> {
  const { error } = await supabase.from('expense_categories').delete().eq('id', id)
  if (error) throw error
}

/** Ids des dépenses d'une catégorie, tous mois confondus (pour pouvoir annuler une suppression). */
export async function fetchExpenseIdsByCategory(categoryId: string): Promise<string[]> {
  const rows = await fetchAllRows<{ id: string }>((from, to) =>
    supabase
      .from('expenses')
      .select('id')
      .eq('category_id', categoryId)
      .order('id')
      .range(from, to),
  )
  return rows.map((r) => r.id)
}

export async function setExpensesCategory(ids: string[], categoryId: string | null): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from('expenses')
    .update({ category_id: categoryId })
    .in('id', ids)
  if (error) throw error
}

// Revenus

export async function fetchIncomes(month: string): Promise<Income[]> {
  const { from, to } = monthBounds(month)
  return fetchAllRows<Income>((start, end) =>
    supabase
      .from('incomes')
      .select('*')
      .gte('received_on', from)
      .lt('received_on', to)
      .order('received_on', { ascending: false })
      .order('id')
      .range(start, end),
  )
}

export async function insertIncome(income: Income): Promise<void> {
  const { error } = await supabase.from('incomes').insert(income)
  if (error) throw error
}

export async function patchIncome(id: string, patch: IncomePatch): Promise<void> {
  const { error } = await supabase.from('incomes').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeIncome(id: string): Promise<void> {
  const { error } = await supabase.from('incomes').delete().eq('id', id)
  if (error) throw error
}

// Récurrences

export async function fetchRecurring(): Promise<RecurringEntry[]> {
  const { data, error } = await supabase.from('recurring_entries').select('*').order('created_at')
  if (error) throw error
  return data as RecurringEntry[]
}

export async function insertRecurring(rule: RecurringEntry): Promise<void> {
  const { error } = await supabase.from('recurring_entries').insert(rule)
  if (error) throw error
}

export async function patchRecurring(id: string, patch: RecurringPatch): Promise<void> {
  const { error } = await supabase.from('recurring_entries').update(patch).eq('id', id)
  if (error) throw error
}

/** Supprime la règle ; les dépenses/revenus déjà générés restent. */
export async function removeRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_entries').delete().eq('id', id)
  if (error) throw error
}

/**
 * Insère les occurrences générées. Idempotent : une occurrence déjà créée (par un autre appareil)
 * est ignorée grâce à l'unicité (recurring_id, date).
 */
export async function insertGenerated(rule: RecurringEntry, dates: string[]): Promise<void> {
  const created_at = new Date().toISOString()
  if (rule.kind === 'expense') {
    const rows: Expense[] = dates.map((spent_on) => ({
      id: crypto.randomUUID(),
      category_id: rule.category_id,
      amount_cents: rule.amount_cents,
      spent_on,
      note: rule.note,
      recurring_id: rule.id,
      created_at,
    }))
    const { error } = await supabase
      .from('expenses')
      .upsert(rows, { onConflict: 'recurring_id,spent_on', ignoreDuplicates: true })
    if (error) throw error
  } else {
    const rows: Income[] = dates.map((received_on) => ({
      id: crypto.randomUUID(),
      amount_cents: rule.amount_cents,
      received_on,
      note: rule.note,
      recurring_id: rule.id,
      created_at,
    }))
    const { error } = await supabase
      .from('incomes')
      .upsert(rows, { onConflict: 'recurring_id,received_on', ignoreDuplicates: true })
    if (error) throw error
  }
}
