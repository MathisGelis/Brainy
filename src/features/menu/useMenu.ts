import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saveErrorMessage } from '@/lib/schemaErrors'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import {
  fetchFoods,
  fetchMealItems,
  fetchTargets,
  insertFood,
  insertMealItems,
  patchFood,
  patchMealItem,
  removeFood,
  removeMealItem,
  upsertTargets,
} from './menuApi'
import { normalizeName } from './nutrition'
import type { Food, FoodPatch, MacroTargets, Meal, MealItem, MealItemPatch } from './types'

type Options = { onError?: (message: string) => void }

export const FOODS_KEY = ['foods'] as const
export const mealItemsKey = (from: string, to: string) => ['meal_items', from, to] as const
const MEAL_ITEMS_ALL = ['meal_items'] as const
export const TARGETS_KEY = ['macro_targets'] as const

const byName = (a: Food, b: Food) => a.name.localeCompare(b.name, 'fr')
const byDay = (a: MealItem, b: MealItem) =>
  a.day.localeCompare(b.day) || a.position - b.position || a.created_at.localeCompare(b.created_at)

export type NewFoodInput = Omit<Food, 'id' | 'created_at'>

/** Mes aliments (valeurs pour 100 g), modifiables et supprimables. */
export function useFoods({ onError }: Options = {}) {
  const query = useQuery({ queryKey: FOODS_KEY, queryFn: fetchFoods })
  const add = useOptimisticMutation<Food, Food>(
    FOODS_KEY,
    insertFood,
    (list, food) => [...list.filter((f) => f.id !== food.id), food].sort(byName),
    onError,
  )
  const update = useOptimisticMutation<Food, { id: string; patch: FoodPatch }>(
    FOODS_KEY,
    ({ id, patch }) => patchFood(id, patch),
    (list, { id, patch }) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)).sort(byName),
    onError,
  )
  const remove = useOptimisticMutation<Food, string>(
    FOODS_KEY,
    removeFood,
    (list, id) => list.filter((f) => f.id !== id),
    onError,
    [MEAL_ITEMS_ALL],
  )
  const foods = query.data ?? []
  return {
    foods,
    isLoading: query.isPending,
    /** Retrouve un aliment par son nom (sans accents ni pluriel). */
    findByName: (name: string) => foods.find((f) => normalizeName(f.name) === normalizeName(name)),
    makeFood: (input: NewFoodInput): Food => ({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...input,
    }),
    addFood: (food: Food) => add.mutate(food),
    updateFood: (id: string, patch: FoodPatch) => update.mutate({ id, patch }),
    /** Supprime l'aliment ; renvoie l'annulation (les repas gardent leurs valeurs). */
    deleteFood: (food: Food): (() => void) => {
      remove.mutate(food.id)
      return () => add.mutate(food)
    },
  }
}

export type NewMealItemInput = Omit<MealItem, 'id' | 'created_at' | 'position'>

/** Repas d'une période (une semaine), avec ajout, modification et suppression annulable. */
export function useMealItems(from: string, to: string, { onError }: Options = {}) {
  const queryClient = useQueryClient()
  const key = mealItemsKey(from, to)
  const query = useQuery({ queryKey: key, queryFn: () => fetchMealItems(from, to) })
  const inRange = (i: MealItem) => i.day >= from && i.day <= to

  // Un nouvel aliment (copié de la base ou créé) part avant l'élément de repas qui le cite,
  // dans la même requête : l'ordre est garanti.
  const add = useOptimisticMutation<MealItem, { item: MealItem; newFood?: Food }>(
    key,
    async ({ item, newFood }) => {
      if (newFood) await insertFood(newFood)
      await insertMealItems([item])
    },
    (list, { item }) => (inRange(item) ? [...list, item].sort(byDay) : list),
    onError,
    [MEAL_ITEMS_ALL, FOODS_KEY],
  )
  const update = useOptimisticMutation<MealItem, { id: string; patch: MealItemPatch }>(
    key,
    ({ id, patch }) => patchMealItem(id, patch),
    (list, { id, patch }) =>
      list
        .map((i) => (i.id === id ? { ...i, ...patch } : i))
        .filter(inRange)
        .sort(byDay),
    onError,
    [MEAL_ITEMS_ALL],
  )
  const remove = useOptimisticMutation<MealItem, string>(
    key,
    removeMealItem,
    (list, id) => list.filter((i) => i.id !== id),
    onError,
  )
  const restore = useOptimisticMutation<MealItem, MealItem>(
    key,
    (item) => insertMealItems([item]),
    (list, item) =>
      inRange(item) ? [...list.filter((i) => i.id !== item.id), item].sort(byDay) : list,
    onError,
  )

  const items = query.data ?? []
  return {
    items,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    /** Ajoute un aliment à un repas (et crée l'aliment s'il est nouveau) ; renvoie l'élément. */
    addItem: (input: NewMealItemInput, newFood?: Food): MealItem => {
      if (newFood) {
        queryClient.setQueryData<Food[]>(FOODS_KEY, (old) =>
          [...(old ?? []).filter((f) => f.id !== newFood.id), newFood].sort(byName),
        )
      }
      const sameMeal = items.filter((i) => i.day === input.day && i.meal === input.meal)
      const item: MealItem = {
        id: crypto.randomUUID(),
        position: sameMeal.reduce((max, i) => Math.max(max, i.position), -1) + 1,
        created_at: new Date().toISOString(),
        ...input,
      }
      add.mutate({ item, newFood })
      return item
    },
    updateItem: (id: string, patch: MealItemPatch) => update.mutate({ id, patch }),
    /** Supprime l'élément ; renvoie l'annulation. */
    deleteItem: (item: MealItem): (() => void) => {
      remove.mutate(item.id)
      return () => restore.mutate(item)
    },
    moveItem: (id: string, meal: Meal) => update.mutate({ id, patch: { meal } }),
  }
}

const EMPTY_TARGETS: MacroTargets = { kcal: null, protein_g: null, carbs_g: null, fat_g: null }

/** Objectifs du jour (kcal et macros), une ligne par utilisateur. */
export function useMacroTargets({ onError }: Options = {}) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: TARGETS_KEY, queryFn: fetchTargets })
  const save = useMutation({
    mutationFn: (targets: MacroTargets) => upsertTargets(targets),
    scope: { id: JSON.stringify(TARGETS_KEY) },
    onMutate: async (targets: MacroTargets) => {
      await queryClient.cancelQueries({ queryKey: TARGETS_KEY })
      const previous = queryClient.getQueryData<MacroTargets | null>(TARGETS_KEY)
      queryClient.setQueryData(TARGETS_KEY, targets)
      return { previous }
    },
    onError: (error, _v, context) => {
      queryClient.setQueryData(TARGETS_KEY, context?.previous ?? null)
      onError?.(saveErrorMessage(error))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TARGETS_KEY }),
  })
  const targets = query.data ?? null
  return {
    targets: targets ?? EMPTY_TARGETS,
    hasTargets: targets !== null && Object.values(targets).some((v) => v !== null),
    isLoading: query.isPending,
    saveTargets: (t: MacroTargets) => save.mutate(t),
  }
}
