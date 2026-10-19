import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { todayISO } from '@/lib/dates'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import {
  fetchExpenses,
  fetchExpensesBetween,
  fetchIncomes,
  fetchRecurring,
  insertExpense,
  insertGenerated,
  insertIncome,
  insertRecurring,
  patchExpense,
  patchIncome,
  patchRecurring,
  removeIncome,
  removeRecurring,
} from './budgetApi'
import { dueOccurrences, occurrenceIn } from './recurringLogic'
import type {
  EntryKind,
  Expense,
  Income,
  IncomePatch,
  RecurringEntry,
  RecurringPatch,
} from './types'
import { expensesKey } from './useBudget'

type Options = { onError?: (message: string) => void }

export const incomesKey = (month: string) => ['incomes', month] as const
export const RECURRING_KEY = ['recurring_entries'] as const

/** Dépenses d'un mois en lecture seule (ex. mois précédent pour les tendances). */
export function useMonthExpenses(month: string) {
  const query = useQuery({ queryKey: expensesKey(month), queryFn: () => fetchExpenses(month) })
  return query.data ?? []
}

/** Dépenses entre deux jours inclus, en lecture seule (clé sous ['expenses'] : rafraîchie avec le reste). */
export function useExpensesBetween(from: string, to: string) {
  const query = useQuery({
    queryKey: ['expenses', 'range', from, to],
    queryFn: () => fetchExpensesBetween(from, to),
  })
  return { expenses: query.data ?? [], isLoading: query.isPending }
}

export type NewIncomeInput = { amount_cents: number; received_on: string; note: string | null }

export function useIncomes(month: string, { onError }: Options = {}) {
  const key = incomesKey(month)
  const query = useQuery({ queryKey: key, queryFn: () => fetchIncomes(month) })
  const inMonth = (i: Income) => i.received_on.slice(0, 7) === month
  const byDateDesc = (a: Income, b: Income) =>
    b.received_on.localeCompare(a.received_on) || b.created_at.localeCompare(a.created_at)

  const add = useOptimisticMutation<Income, Income>(
    key,
    insertIncome,
    (list, income) =>
      inMonth(income) ? [...list.filter((i) => i.id !== income.id), income].sort(byDateDesc) : list,
    onError,
  )
  const update = useOptimisticMutation<Income, { id: string; patch: IncomePatch }>(
    key,
    ({ id, patch }) => patchIncome(id, patch),
    (list, { id, patch }) =>
      list
        .map((i) => (i.id === id ? { ...i, ...patch } : i))
        .filter(inMonth)
        .sort(byDateDesc),
    onError,
  )
  const remove = useOptimisticMutation<Income, string>(
    key,
    removeIncome,
    (list, id) => list.filter((i) => i.id !== id),
    onError,
  )

  return {
    incomes: query.data ?? [],
    totalIncome: (query.data ?? []).reduce((sum, i) => sum + i.amount_cents, 0),
    addIncome: (input: NewIncomeInput) =>
      add.mutate({
        id: crypto.randomUUID(),
        recurring_id: null,
        created_at: new Date().toISOString(),
        ...input,
      }),
    restoreIncome: (income: Income) => add.mutate(income),
    updateIncome: (id: string, patch: IncomePatch) => update.mutate({ id, patch }),
    deleteIncome: (id: string) => remove.mutate(id),
  }
}

export type NewRecurringInput = {
  kind: EntryKind
  amount_cents: number
  category_id: string | null
  note: string | null
  day_of_month: number
  /** Compter aussi le mois en cours si le jour est déjà passé */
  includeThisMonth?: boolean
}

export type NewRecurringEntryInput = {
  kind: EntryKind
  amount_cents: number
  category_id: string | null
  note: string | null
  day_of_month: number
  /** Première occurrence à enregistrer tout de suite (null : le jour n'est pas encore arrivé) */
  first_on: string | null
}

export function useRecurring({ onError }: Options = {}) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: RECURRING_KEY, queryFn: fetchRecurring })

  const add = useOptimisticMutation<RecurringEntry, RecurringEntry>(
    RECURRING_KEY,
    insertRecurring,
    (list, rule) => [...list.filter((r) => r.id !== rule.id), rule],
    onError,
  )
  const update = useOptimisticMutation<RecurringEntry, { id: string; patch: RecurringPatch }>(
    RECURRING_KEY,
    ({ id, patch }) => patchRecurring(id, patch),
    (list, { id, patch }) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    onError,
  )
  const remove = useOptimisticMutation<RecurringEntry, string>(
    RECURRING_KEY,
    removeRecurring,
    (list, id) => list.filter((r) => r.id !== id),
    onError,
  )
  // Créer la règle puis lier la dépense d'origine, dans une seule requête
  const fromExpense = useOptimisticMutation<
    RecurringEntry,
    { rule: RecurringEntry; expenseId: string }
  >(
    RECURRING_KEY,
    async ({ rule, expenseId }) => {
      await insertRecurring(rule)
      await patchExpense(expenseId, { recurring_id: rule.id })
    },
    (list, { rule }) => [...list.filter((r) => r.id !== rule.id), rule],
    onError,
    [['expenses']],
  )

  // Règle + première occurrence, dans une seule requête (la règle d'abord : clé étrangère)
  const createWithFirst = useOptimisticMutation<
    RecurringEntry,
    { rule: RecurringEntry; first: Expense | Income | null }
  >(
    RECURRING_KEY,
    async ({ rule, first }) => {
      await insertRecurring(rule)
      if (first && rule.kind === 'expense') await insertExpense(first as Expense)
      if (first && rule.kind === 'income') await insertIncome(first as Income)
    },
    (list, { rule }) => [...list.filter((r) => r.id !== rule.id), rule],
    onError,
    [['expenses'], ['incomes']],
  )

  return {
    rules: query.data ?? [],
    /**
     * « 900 loyer le 5 tous les mois » : crée la règle et, si le jour est passé, l'occurrence du mois
     * (déjà comptée : elle ne sera pas régénérée). Sinon la règle part du jour à venir.
     */
    addRecurringEntry: (
      input: NewRecurringEntryInput,
    ): { rule: RecurringEntry; firstId: string | null } => {
      const today = todayISO()
      const { first_on, ...rest } = input
      const startOn = first_on ?? occurrenceIn(today.slice(0, 7), input.day_of_month)
      const rule: RecurringEntry = {
        id: crypto.randomUUID(),
        start_on: startOn,
        last_generated_on: first_on,
        active: true,
        created_at: new Date().toISOString(),
        ...rest,
      }
      let first: Expense | Income | null = null
      const created_at = new Date().toISOString()
      if (first_on && input.kind === 'expense') {
        first = {
          id: crypto.randomUUID(),
          category_id: input.category_id,
          amount_cents: input.amount_cents,
          spent_on: first_on,
          note: input.note,
          recurring_id: rule.id,
          created_at,
        }
        queryClient.setQueryData<Expense[]>(expensesKey(first_on.slice(0, 7)), (old) =>
          old ? [first as Expense, ...old] : old,
        )
      } else if (first_on) {
        first = {
          id: crypto.randomUUID(),
          amount_cents: input.amount_cents,
          received_on: first_on,
          note: input.note,
          recurring_id: rule.id,
          created_at,
        }
        queryClient.setQueryData<Income[]>(incomesKey(first_on.slice(0, 7)), (old) =>
          old ? [first as Income, ...old] : old,
        )
      }
      createWithFirst.mutate({ rule, first })
      return { rule, firstId: first?.id ?? null }
    },
    addRule: (input: NewRecurringInput) => {
      const today = todayISO()
      const { includeThisMonth, ...rest } = input
      add.mutate({
        id: crypto.randomUUID(),
        start_on: includeThisMonth ? `${today.slice(0, 7)}-01` : today,
        last_generated_on: null,
        active: true,
        created_at: new Date().toISOString(),
        ...rest,
      })
    },
    updateRule: (id: string, patch: RecurringPatch) => update.mutate({ id, patch }),
    restoreRule: (rule: RecurringEntry) => add.mutate(rule),
    deleteRule: (id: string) => remove.mutate(id),
    /**
     * Transforme une dépense existante en dépense mensuelle : la règle part de cette dépense
     * (qui devient sa première occurrence, sans doublon).
     */
    repeatMonthly: (expense: Expense) => {
      const rule: RecurringEntry = {
        id: crypto.randomUUID(),
        kind: 'expense',
        amount_cents: expense.amount_cents,
        category_id: expense.category_id,
        note: expense.note,
        day_of_month: Number(expense.spent_on.slice(8)),
        start_on: expense.spent_on,
        last_generated_on: expense.spent_on,
        active: true,
        created_at: new Date().toISOString(),
      }
      fromExpense.mutate({ rule, expenseId: expense.id })
      return rule
    },
  }
}

/**
 * Génère, une fois par ouverture de l'app, les occurrences récurrentes arrivées à échéance
 * (loyer le 5, salaire le 28…), puis rafraîchit dépenses et revenus.
 */
export function useRecurringGeneration() {
  const queryClient = useQueryClient()
  const { data: rules } = useQuery({ queryKey: RECURRING_KEY, queryFn: fetchRecurring })
  const started = useRef(false)

  useEffect(() => {
    if (!rules || started.current) return
    const today = todayISO()
    const work = rules
      .map((rule) => ({ rule, dates: dueOccurrences(rule, today) }))
      .filter((w) => w.dates.length > 0)
    if (work.length === 0) return
    started.current = true
    void (async () => {
      for (const { rule, dates } of work) {
        await insertGenerated(rule, dates)
        await patchRecurring(rule.id, { last_generated_on: dates.at(-1)! })
      }
      await Promise.all(
        [['expenses'], ['incomes'], RECURRING_KEY].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      )
    })().catch(() => {
      started.current = false
    })
  }, [rules, queryClient])
}
