import { monthBounds } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { Category, CategoryPatch, Expense, ExpensePatch } from './types'

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
  const { data, error } = await supabase
    .from('expenses')
    .select('id, category_id, amount_cents, spent_on, note, created_at')
    .gte('spent_on', from)
    .lt('spent_on', to)
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Expense[]
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
