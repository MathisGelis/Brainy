import { useState } from 'react'
import { useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { addMonths, formatMonthLabel, monthOf, todayISO } from '@/lib/dates'
import { CategoriesManager } from './CategoriesManager'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseList } from './ExpenseList'
import { MonthSummary } from './MonthSummary'
import type { Expense } from './types'
import { useBudget } from './useBudget'

export default function BudgetPage() {
  const toast = useToast()
  const currentMonth = monthOf(todayISO())
  const [month, setMonth] = useState(currentMonth)
  const budget = useBudget(month, { onError: (m) => toast.show(m) })

  function onDelete(expense: Expense) {
    budget.deleteExpense(expense.id)
    toast.show('Dépense supprimée', () => budget.restoreExpense(expense))
  }

  const navButton =
    'min-h-11 min-w-11 rounded text-muted hover:bg-surface hover:text-text md:min-h-9 md:min-w-9'

  return (
    <>
      <PageHeader title="Budget" />
      <ExpenseForm categories={budget.categories} onAdd={budget.addExpense} />

      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Mois précédent"
          className={navButton}
          onClick={() => setMonth(addMonths(month, -1))}
        >
          ←
        </button>
        <h2 className="min-w-36 text-center font-semibold capitalize" aria-live="polite">
          {formatMonthLabel(month)}
        </h2>
        <button
          type="button"
          aria-label="Mois suivant"
          className={navButton}
          onClick={() => setMonth(addMonths(month, 1))}
        >
          →
        </button>
        {month !== currentMonth && (
          <button
            type="button"
            className="min-h-11 px-2 text-accent md:min-h-9"
            onClick={() => setMonth(currentMonth)}
          >
            Ce mois-ci
          </button>
        )}
      </div>

      {budget.isError ? (
        <p role="alert" className="text-danger">
          Impossible de charger le budget.{' '}
          <button
            type="button"
            onClick={() => void budget.refetch()}
            className="min-h-11 font-semibold underline"
          >
            Réessayer
          </button>
        </p>
      ) : budget.isLoading ? (
        <div aria-hidden className="h-24 animate-pulse rounded bg-surface" />
      ) : (
        <>
          <MonthSummary summary={budget.summary} />
          <ExpenseList
            expenses={budget.expenses}
            categories={budget.categories}
            onUpdate={budget.updateExpense}
            onDelete={onDelete}
          />
          <CategoriesManager
            categories={budget.categories}
            onAdd={budget.addCategory}
            onAddDefaults={budget.addDefaultCategories}
            onUpdate={budget.updateCategory}
          />
        </>
      )}
    </>
  )
}
