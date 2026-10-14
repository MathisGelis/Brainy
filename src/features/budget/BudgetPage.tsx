import { useState } from 'react'
import { useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { addMonths, formatMonthLabel, monthOf, todayISO } from '@/lib/dates'
import { CategoriesManager } from './CategoriesManager'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseList } from './ExpenseList'
import { IncomeList } from './IncomeList'
import { MonthSummary } from './MonthSummary'
import { RecurringManager } from './RecurringManager'
import { categoryTrends, projectMonthEnd } from './recurringLogic'
import type { Category, Expense, Income, RecurringEntry } from './types'
import { useBudget } from './useBudget'
import { useIncomes, useMonthExpenses, useRecurring } from './useBudgetExtras'

const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' })

export default function BudgetPage() {
  const toast = useToast()
  const today = todayISO()
  const currentMonth = monthOf(today)
  const [month, setMonth] = useState(currentMonth)
  const onError = (m: string) => toast.show(m)
  const budget = useBudget(month, { onError })
  const income = useIncomes(month, { onError })
  const recurring = useRecurring({ onError })
  const previousMonth = addMonths(month, -1)
  const previousExpenses = useMonthExpenses(previousMonth)

  const projection = projectMonthEnd(budget.expenses, recurring.rules, month, today)
  const trends = categoryTrends(budget.expenses, previousExpenses, month, today)
  const previousLabel = shortMonth.format(new Date(`${previousMonth}-15T12:00:00Z`))

  function onDelete(expense: Expense) {
    budget.deleteExpense(expense.id)
    toast.show('Dépense supprimée', () => budget.restoreExpense(expense))
  }

  function onDeleteIncome(entry: Income) {
    income.deleteIncome(entry.id)
    toast.show('Revenu supprimé', () => income.restoreIncome(entry))
  }

  function onRepeat(expense: Expense) {
    const rule = recurring.repeatMonthly(expense)
    toast.show(`Répétée le ${rule.day_of_month} de chaque mois`, () =>
      recurring.deleteRule(rule.id),
    )
  }

  function onDeleteRule(rule: RecurringEntry) {
    recurring.deleteRule(rule.id)
    toast.show('Récurrence supprimée (les montants passés restent)', () =>
      recurring.restoreRule(rule),
    )
  }

  async function onDeleteCategory(category: Category) {
    try {
      const undo = await budget.deleteCategory(category)
      toast.show(`Catégorie « ${category.name} » supprimée`, undo)
    } catch {
      toast.show('La suppression a échoué. Réessayez.')
    }
  }

  const navButton =
    'flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text md:min-h-10 md:min-w-10'

  return (
    <>
      <PageHeader title="Budget" />
      <ExpenseForm
        categories={budget.categories}
        onAdd={budget.addExpense}
        onAddIncome={(entry) => {
          income.addIncome(entry)
          toast.show('Revenu ajouté')
        }}
      />

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
            className="min-h-11 rounded-full px-4 text-accent transition-colors hover:bg-surface md:min-h-9"
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
        <div aria-hidden className="h-24 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <>
          <MonthSummary
            summary={budget.summary}
            totalIncome={income.totalIncome}
            projection={projection}
            trends={trends}
            previousLabel={previousLabel}
          />
          <ExpenseList
            expenses={budget.expenses}
            categories={budget.categories}
            onUpdate={budget.updateExpense}
            onDelete={onDelete}
            onRepeat={onRepeat}
          />
          <IncomeList
            incomes={income.incomes}
            onUpdate={income.updateIncome}
            onDelete={onDeleteIncome}
          />
          <RecurringManager
            rules={recurring.rules}
            categories={budget.categories}
            onAdd={recurring.addRule}
            onUpdate={recurring.updateRule}
            onDelete={onDeleteRule}
          />
          <CategoriesManager
            categories={budget.categories}
            onAdd={budget.addCategory}
            onAddDefaults={budget.addDefaultCategories}
            onUpdate={budget.updateCategory}
            onDelete={(c) => void onDeleteCategory(c)}
          />
        </>
      )}
    </>
  )
}
