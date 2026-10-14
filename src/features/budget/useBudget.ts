import { useQuery, useQueryClient } from '@tanstack/react-query'
import { monthBounds } from '@/lib/dates'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import {
  fetchCategories,
  fetchExpenses,
  fetchExpenseIdsByCategory,
  insertCategories,
  insertExpense,
  patchCategory,
  patchExpense,
  removeCategory,
  removeExpense,
  setExpensesCategory,
} from './budgetApi'
import { DEFAULT_CATEGORIES, summarizeMonth } from './budgetLogic'
import type { Category, CategoryPatch, Expense, ExpensePatch } from './types'

export const CATEGORIES_KEY = ['expense_categories'] as const
export const expensesKey = (month: string) => ['expenses', month] as const

export type NewExpenseInput = {
  amount_cents: number
  category_id: string | null
  spent_on: string
  note: string | null
}

/** Catégories + dépenses du mois `YYYY-MM` (format interne : centimes). */
export function useBudget(
  month: string,
  { onError }: { onError?: (message: string) => void } = {},
) {
  const queryClient = useQueryClient()
  const categoriesQuery = useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchCategories })
  const expensesQuery = useQuery({
    queryKey: expensesKey(month),
    queryFn: () => fetchExpenses(month),
  })
  const key = expensesKey(month)
  const { from, to } = monthBounds(month)
  const inMonth = (e: Expense) => e.spent_on >= from && e.spent_on < to
  const byDateDesc = (a: Expense, b: Expense) =>
    b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at)

  const addExpenseM = useOptimisticMutation<Expense, Expense>(
    key,
    insertExpense,
    (list, e) => (inMonth(e) ? [...list, e].sort(byDateDesc) : list),
    onError,
  )
  const updateExpenseM = useOptimisticMutation<Expense, { id: string; patch: ExpensePatch }>(
    key,
    ({ id, patch }) => patchExpense(id, patch),
    (list, { id, patch }) =>
      list
        .map((e) => (e.id === id ? { ...e, ...patch } : e))
        .filter(inMonth)
        .sort(byDateDesc),
    onError,
  )
  const deleteExpenseM = useOptimisticMutation<Expense, string>(
    key,
    removeExpense,
    (list, id) => list.filter((e) => e.id !== id),
    onError,
  )
  const addCategoriesM = useOptimisticMutation<Category, Category[]>(
    CATEGORIES_KEY,
    insertCategories,
    (list, added) => [...list, ...added],
    onError,
  )
  const updateCategoryM = useOptimisticMutation<Category, { id: string; patch: CategoryPatch }>(
    CATEGORIES_KEY,
    ({ id, patch }) => patchCategory(id, patch),
    (list, { id, patch }) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    onError,
  )

  const removeCategoryM = useOptimisticMutation<Category, string>(
    CATEGORIES_KEY,
    removeCategory,
    (list, id) => list.filter((c) => c.id !== id),
    onError,
    [['expenses'], ['recurring_entries']],
  )
  // Annulation : recréer la catégorie puis y rattacher ses dépenses, dans une seule requête
  const restoreCategory = useOptimisticMutation<Category, { category: Category; ids: string[] }>(
    CATEGORIES_KEY,
    async ({ category, ids }) => {
      await insertCategories([category])
      await setExpensesCategory(ids, category.id)
    },
    (list, { category }) => [...list.filter((c) => c.id !== category.id), category],
    onError,
    [['expenses'], ['recurring_entries']],
  )

  const categories = categoriesQuery.data ?? []
  const expenses = expensesQuery.data ?? []

  const makeCategory = (name: string, position: number): Category => ({
    id: crypto.randomUUID(),
    name,
    color: null,
    monthly_budget_cents: null,
    position,
    archived: false,
  })
  const nextCategoryPosition = () =>
    categories.reduce((max, c) => Math.max(max, c.position), -1) + 1

  return {
    categories,
    expenses,
    summary: summarizeMonth(categories, expenses),
    isLoading: categoriesQuery.isPending || expensesQuery.isPending,
    isError: categoriesQuery.isError || expensesQuery.isError,
    refetch: () => Promise.all([categoriesQuery.refetch(), expensesQuery.refetch()]),

    addExpense: (input: NewExpenseInput) =>
      addExpenseM.mutate({
        id: crypto.randomUUID(),
        recurring_id: null,
        created_at: new Date().toISOString(),
        ...input,
      }),
    /** Remet une dépense supprimée (annulation), avec son id d'origine. */
    restoreExpense: (expense: Expense) => addExpenseM.mutate(expense),
    updateExpense: (id: string, patch: ExpensePatch) => updateExpenseM.mutate({ id, patch }),
    deleteExpense: (id: string) => deleteExpenseM.mutate(id),

    addCategory: (name: string) =>
      addCategoriesM.mutate([makeCategory(name, nextCategoryPosition())]),
    addDefaultCategories: () =>
      addCategoriesM.mutate(DEFAULT_CATEGORIES.map((name, i) => makeCategory(name, i))),
    updateCategory: (id: string, patch: CategoryPatch) => updateCategoryM.mutate({ id, patch }),
    /**
     * Supprime une catégorie ; ses dépenses (tous mois confondus) restent, sans catégorie.
     * Renvoie l'annulation, qui recrée la catégorie et y rattache de nouveau ces dépenses.
     */
    deleteCategory: async (category: Category): Promise<() => void> => {
      const ids = await fetchExpenseIdsByCategory(category.id)
      queryClient.setQueriesData<Expense[]>({ queryKey: ['expenses'] }, (old) =>
        old?.map((e) => (e.category_id === category.id ? { ...e, category_id: null } : e)),
      )
      removeCategoryM.mutate(category.id)
      return () => {
        queryClient.setQueriesData<Expense[]>({ queryKey: ['expenses'] }, (old) =>
          old?.map((e) => (ids.includes(e.id) ? { ...e, category_id: category.id } : e)),
        )
        restoreCategory.mutate({ category, ids })
      }
    },
  }
}
