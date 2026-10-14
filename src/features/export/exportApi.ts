import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'

export const EXPORTED_TABLES = [
  'goals',
  'goal_milestones',
  'notes',
  'habits',
  'habit_logs',
  'todo_lists',
  'todos',
  'expense_categories',
  'expenses',
  'habit_days_off',
  'recurring_entries',
  'incomes',
  'day_checkins',
  'savings_goals',
  'savings_moves',
] as const

export type ExportedTable = (typeof EXPORTED_TABLES)[number]
export type Backup = {
  exported_at: string
  version: 1
  tables: Record<ExportedTable, Record<string, unknown>[]>
}

/** Lit toutes les tables de l'utilisateur (la RLS limite aux lignes du compte connecté). */
export async function fetchBackup(): Promise<Backup> {
  const entries = await Promise.all(
    EXPORTED_TABLES.map(async (table) => {
      const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
        supabase.from(table).select('*').order('id').range(from, to),
      )
      return [table, rows] as const
    }),
  )
  return {
    exported_at: new Date().toISOString(),
    version: 1,
    tables: Object.fromEntries(entries) as Backup['tables'],
  }
}
