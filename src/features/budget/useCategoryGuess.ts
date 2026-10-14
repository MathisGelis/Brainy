import { useMemo } from 'react'
import { addDays, todayISO } from '@/lib/dates'
import { buildGuessIndex, guessCategory } from './categoryGuess'
import type { Category } from './types'
import { useExpensesBetween } from './useBudgetExtras'

/** Six mois d'historique suffisent pour connaître ses habitudes, sans tout relire. */
const HISTORY_DAYS = 183

/** Devine la catégorie d'une note d'après les dépenses des six derniers mois. */
export function useCategoryGuess(categories: Category[]) {
  const today = todayISO()
  const { expenses } = useExpensesBetween(addDays(today, -HISTORY_DAYS), today)
  const index = useMemo(() => buildGuessIndex(expenses, categories), [expenses, categories])
  return (note: string | null) => guessCategory(index, note)
}
