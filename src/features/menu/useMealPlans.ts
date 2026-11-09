import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/schemaErrors'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import { CATALOG } from './catalog'
import { applyPlanWeek, savePlanFile } from './mealPlans'
import {
  fetchFoods,
  fetchMealPlans,
  fetchPantry,
  fetchPlanItems,
  fetchPlanWeeks,
  fetchRecipes,
  insertMealItems,
  insertMealPlan,
  removeMealItems,
  removeMealPlan,
  upsertPantry,
  upsertPlanWeek,
} from './menuApi'
import { adjustPantry, pantryKey, type Quantity } from './shopping'
import type { MacroTargets, MealPlan, MealPlanWeek, PantryItem } from './types'
import { FOODS_KEY, RECIPES_KEY, TARGETS_KEY } from './useMenu'

type Options = { onError?: (message: string) => void }

export const PLANS_KEY = ['meal_plans'] as const
export const PLAN_WEEKS_KEY = ['meal_plan_weeks'] as const
export const PANTRY_KEY = ['pantry'] as const
const MEAL_ITEMS_ALL = ['meal_items'] as const

/** Ce qui doit être relu après une écriture de plan. */
const TOUCHED = [PLANS_KEY, PLAN_WEEKS_KEY, MEAL_ITEMS_ALL, FOODS_KEY, RECIPES_KEY, TARGETS_KEY]

/**
 * Bibliothèque de plans de repas et plan de chaque semaine. Les écritures partent l'une après
 * l'autre (même file), chacune relisant aliments et recettes : deux semaines appliquées vite
 * ne créent pas deux fois le même aliment.
 */
export function useMealPlans({ onError }: Options = {}) {
  const queryClient = useQueryClient()
  const plans = useQuery({ queryKey: PLANS_KEY, queryFn: fetchMealPlans })
  const weeks = useQuery({ queryKey: PLAN_WEEKS_KEY, queryFn: fetchPlanWeeks })
  const scope = { id: 'meal-plans' }
  const refresh = () =>
    Promise.all(TOUCHED.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  const fail = (error: unknown) => onError?.(saveErrorMessage(error))
  const freshCtx = async () => {
    const [foods, recipes] = await Promise.all([fetchFoods(), fetchRecipes()])
    return { foods, recipes, catalog: CATALOG }
  }

  const add = useMutation({
    scope,
    mutationFn: async (v: { name: string; content: string; currentTargets: MacroTargets }) =>
      savePlanFile(v, await freshCtx(), v.currentTargets),
    onError: fail,
    onSettled: refresh,
  })

  const setWeek = useMutation({
    scope,
    mutationFn: async (v: { monday: string; plan: MealPlan | null; weekType: string | null }) =>
      applyPlanWeek({ ...v, ctx: await freshCtx(), today: todayISO() }),
    onMutate: async ({ monday, plan, weekType }) => {
      await queryClient.cancelQueries({ queryKey: PLAN_WEEKS_KEY })
      const previous = queryClient.getQueryData<MealPlanWeek[]>(PLAN_WEEKS_KEY)
      queryClient.setQueryData<MealPlanWeek[]>(PLAN_WEEKS_KEY, (old = []) => [
        ...old.filter((w) => w.monday !== monday),
        ...(plan
          ? [{ id: 'pending', monday, plan_id: plan.id, week_type: weekType, created_at: '' }]
          : []),
      ])
      return { previous }
    },
    onError: (error, _v, context) => {
      if (context?.previous) queryClient.setQueryData(PLAN_WEEKS_KEY, context.previous)
      fail(error)
    },
    onSettled: refresh,
  })

  // Supprimer un plan retire ses repas pas encore mangés à venir ; l'annulation remet le tout
  const remove = useMutation({
    scope,
    mutationFn: async (plan: MealPlan) => {
      const planWeeks = (queryClient.getQueryData<MealPlanWeek[]>(PLAN_WEEKS_KEY) ?? []).filter(
        (w) => w.plan_id === plan.id && w.id !== 'pending',
      )
      const items = await fetchPlanItems(plan.id, todayISO())
      await removeMealItems(items.map((i) => i.id))
      await removeMealPlan(plan.id)
      return { plan, planWeeks, items }
    },
    onMutate: async (plan) => {
      await queryClient.cancelQueries({ queryKey: PLANS_KEY })
      queryClient.setQueryData<MealPlan[]>(PLANS_KEY, (old = []) =>
        old.filter((p) => p.id !== plan.id),
      )
    },
    onError: fail,
    onSettled: refresh,
  })
  const restore = useMutation({
    scope,
    mutationFn: async (v: {
      plan: MealPlan
      planWeeks: MealPlanWeek[]
      items: Parameters<typeof insertMealItems>[0]
    }) => {
      await insertMealPlan(v.plan)
      for (const w of v.planWeeks) await upsertPlanWeek(w)
      await insertMealItems(v.items)
    },
    onError: fail,
    onSettled: refresh,
  })

  return {
    plans: plans.data ?? [],
    weeks: weeks.data ?? [],
    isLoading: plans.isPending || weeks.isPending,
    saving: add.isPending || setWeek.isPending,
    /** Ajoute un fichier .md aux plans (aliments, recettes et objectifs écrits tout de suite). */
    addPlan: (name: string, content: string, currentTargets: MacroTargets) =>
      add.mutateAsync({ name, content, currentTargets }),
    /** Plan (et type) de la semaine du lundi `monday`, ou aucun : repas reposés dès aujourd'hui. */
    setWeekPlan: (monday: string, plan: MealPlan | null, weekType: string | null) =>
      setWeek.mutateAsync({ monday, plan, weekType }),
    /** Supprime le plan ; renvoie l'annulation (qui attend la fin de la suppression). */
    deletePlan: (plan: MealPlan): (() => void) => {
      const done = remove.mutateAsync(plan)
      return () => {
        void done.then((v) => restore.mutate(v)).catch(() => {})
      }
    },
  }
}

/** Ce qu'il y a à la maison, par aliment (grammes). */
export function usePantry({ onError }: Options = {}) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: PANTRY_KEY, queryFn: fetchPantry })
  // Le changement est appliqué au cache d'abord ; la requête envoie ensuite les lignes du cache :
  // deux changements rapprochés s'additionnent au lieu de s'écraser.
  type Change = { keys: string[]; rows: (list: PantryItem[]) => PantryItem[] }
  const save = useOptimisticMutation<PantryItem, Change>(
    PANTRY_KEY,
    ({ keys }) =>
      upsertPantry(
        (queryClient.getQueryData<PantryItem[]>(PANTRY_KEY) ?? []).filter((p) =>
          keys.includes(p.key),
        ),
      ),
    (list, { rows }) => {
      const changed = rows(list)
      return [...list.filter((p) => !changed.some((r) => r.key === p.key)), ...changed]
    },
    onError,
  )
  return {
    pantry: query.data ?? [],
    /** Fixe la quantité à la maison d'un aliment. */
    setStock: (name: string, grams: number) => {
      const key = pantryKey(name)
      save.mutate({
        keys: [key],
        rows: (list) => {
          const existing = list.find((p) => p.key === key)
          return [
            {
              id: existing?.id ?? crypto.randomUUID(),
              key,
              name: existing?.name ?? name,
              grams: Math.max(0, Math.round(grams)),
              updated_at: new Date().toISOString(),
            },
          ]
        },
      })
    },
    /** Entrées (achats) et sorties (repas mangés) ; une sortie sans stock connu est ignorée. */
    adjust: (deltas: Quantity[]) => {
      if (deltas.length === 0) return
      save.mutate({ keys: deltas.map((d) => d.key), rows: (list) => adjustPantry(list, deltas) })
    },
  }
}
