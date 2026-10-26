import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchExpensesBetween,
  fetchIncomesBetween,
  insertIncome,
  removeIncome,
} from '@/features/budget/budgetApi'
import type { Income } from '@/features/budget/types'
import { GOALS_KEY } from '@/features/goals/useGoals'
import { SAVINGS_KEY } from '@/features/savings/useSavings'
import { saveErrorMessage } from '@/lib/schemaErrors'
import type { ImportRows } from './importRows'
import { fetchPlan, fetchPlanSettings, patchRow, replacePlan, upsertPlanSettings } from './planApi'
import type { Plan, PlanBonus } from './types'

export const PLAN_KEY = ['plan'] as const
export const PLAN_SETTINGS_KEY = ['plan_settings'] as const
export const DEFAULT_RATE_MILLI = 1500

type Options = { onError?: (message: string) => void }
type Patchable = 'lines' | 'bonuses' | 'envelopes' | 'periods'
const TABLES = {
  lines: 'plan_lines',
  bonuses: 'plan_bonuses',
  envelopes: 'plan_envelopes',
  periods: 'plan_periods',
} as const

/** Revenus et dépenses de l'app entre deux jours (le « réel » du plan). */
export function usePlanReal(from: string | null, to: string) {
  const incomes = useQuery({
    queryKey: ['incomes', 'range', from, to],
    queryFn: () => fetchIncomesBetween(from!, to),
    enabled: from !== null && from <= to,
  })
  const expenses = useQuery({
    queryKey: ['expenses', 'range', from, to],
    queryFn: () => fetchExpensesBetween(from!, to),
    enabled: from !== null && from <= to,
  })
  return { incomes: incomes.data ?? [], expenses: expenses.data ?? [] }
}

export function usePlan({ onError }: Options = {}) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: PLAN_KEY, queryFn: fetchPlan })
  const settings = useQuery({ queryKey: PLAN_SETTINGS_KEY, queryFn: fetchPlanSettings })
  const fail = (error: unknown) => onError?.(saveErrorMessage(error))

  // Modification d'une ligne du plan : appliquée tout de suite, annulée si l'enregistrement échoue
  const patch = useMutation({
    mutationFn: ({ key, id, values }: { key: Patchable; id: string; values: object }) =>
      patchRow(TABLES[key], id, values),
    scope: { id: 'plan' },
    onMutate: async ({ key, id, values }) => {
      await queryClient.cancelQueries({ queryKey: PLAN_KEY })
      const previous = queryClient.getQueryData<Plan>(PLAN_KEY)
      if (previous)
        queryClient.setQueryData<Plan>(PLAN_KEY, {
          ...previous,
          [key]: (previous[key] as { id: string }[]).map((row) =>
            row.id === id ? { ...row, ...values } : row,
          ),
        })
      return { previous }
    },
    onError: (error, _v, context) => {
      if (context?.previous) queryClient.setQueryData(PLAN_KEY, context.previous)
      fail(error)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PLAN_KEY }),
  })

  const rate = useMutation({
    mutationFn: (milli: number) => upsertPlanSettings(milli),
    onMutate: (milli) => {
      const previous = queryClient.getQueryData(PLAN_SETTINGS_KEY)
      queryClient.setQueryData(PLAN_SETTINGS_KEY, { id: 'local', eur_to_cad_milli: milli })
      return { previous }
    },
    onError: (error, _v, context) => {
      queryClient.setQueryData(PLAN_SETTINGS_KEY, context?.previous)
      fail(error)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PLAN_SETTINGS_KEY }),
  })

  const replace = useMutation({
    mutationFn: (rows: ImportRows) => replacePlan(rows),
    onError: fail,
    onSettled: () =>
      Promise.all(
        [PLAN_KEY, SAVINGS_KEY, GOALS_KEY].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  })

  const update = (key: Patchable, id: string, values: object) => patch.mutate({ key, id, values })

  return {
    plan: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    rateMilli: settings.data?.eur_to_cad_milli ?? DEFAULT_RATE_MILLI,
    setRate: (milli: number) => rate.mutate(milli),
    /** Remplace le plan par un classeur importé ; résout quand tout est écrit. */
    importPlan: (rows: ImportRows) => replace.mutateAsync(rows),
    isImporting: replace.isPending,
    update,
    /**
     * Prime reçue : crée le revenu correspondant dans le budget (le réel du mois en tient compte).
     * Un frais (montant négatif) est seulement noté comme payé : la dépense se saisit dans Budget.
     * Renvoie l'annulation.
     */
    markReceived: async (bonus: PlanBonus, cents: number, on: string): Promise<() => void> => {
      let income: Income | null = null
      try {
        if (cents > 0) {
          income = {
            id: crypto.randomUUID(),
            amount_cents: cents,
            received_on: on,
            note: `Prime : ${bonus.label}`.slice(0, 200),
            recurring_id: null,
            created_at: new Date().toISOString(),
          }
          await insertIncome(income)
          void queryClient.invalidateQueries({ queryKey: ['incomes'] })
        }
        update('bonuses', bonus.id, {
          received_cents: cents,
          received_on: on,
          income_id: income?.id ?? null,
        })
      } catch (error) {
        fail(error)
      }
      const created = income
      return () => {
        update('bonuses', bonus.id, { received_cents: null, received_on: null, income_id: null })
        if (created)
          void removeIncome(created.id).then(() =>
            queryClient.invalidateQueries({ queryKey: ['incomes'] }),
          )
      }
    },
  }
}
