import { useState } from 'react'
import type { Category, Expense } from '@/features/budget/types'
import { downloadFile } from '@/lib/csv'
import { todayISO } from '@/lib/dates'
import { fetchBackup } from './exportApi'
import { expensesToCSV } from './exportLogic'

export function useExport({ onError }: { onError?: (message: string) => void } = {}) {
  const [pending, setPending] = useState(false)

  async function run(build: () => Promise<void>) {
    setPending(true)
    try {
      await build()
    } catch {
      onError?.("L'export a échoué. Réessayez.")
    } finally {
      setPending(false)
    }
  }

  return {
    pending,
    /** Sauvegarde complète, réimportable. */
    exportJSON: () =>
      run(async () => {
        const backup = await fetchBackup()
        downloadFile(
          `cockpit-${todayISO()}.json`,
          JSON.stringify(backup, null, 2),
          'application/json',
        )
      }),
    exportExpensesCSV: () =>
      run(async () => {
        const { tables } = await fetchBackup()
        const csv = expensesToCSV(
          tables.expenses as unknown as Expense[],
          tables.expense_categories as unknown as Category[],
        )
        downloadFile(`depenses-${todayISO()}.csv`, csv, 'text/csv;charset=utf-8')
      }),
  }
}
