import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saveErrorMessage } from '@/lib/schemaErrors'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import {
  fetchFoods,
  fetchMealItems,
  fetchTargets,
  fetchRecipes,
  insertFood,
  insertMealItems,
  insertRecipe,
  insertRecipeItems,
  patchFood,
  patchMealItem,
  patchRecipe,
  patchRecipeItem,
  removeFood,
  removeMealItem,
  removeMealItems,
  removeRecipe,
  removeRecipeItem,
  upsertTargets,
} from './menuApi'
import { normalizeName } from './nutrition'
import type {
  Food,
  FoodPatch,
  MacroTargets,
  Meal,
  MealItem,
  MealItemPatch,
  RecipeFull,
  RecipeItem,
  RecipeItemPatch,
  RecipePatch,
} from './types'

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
  const addMany = useOptimisticMutation<MealItem, MealItem[]>(
    key,
    insertMealItems,
    (list, added) => [...list, ...added.filter(inRange)].sort(byDay),
    onError,
    [MEAL_ITEMS_ALL],
  )
  const removeMany = useOptimisticMutation<MealItem, string[]>(
    key,
    removeMealItems,
    (list, ids) => list.filter((i) => !ids.includes(i.id)),
    onError,
    [MEAL_ITEMS_ALL],
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
    /** Ajoute des éléments déjà construits (copie de menu) ; renvoie l'annulation. */
    addItems: (added: MealItem[]): (() => void) => {
      addMany.mutate(added)
      return () => removeMany.mutate(added.map((i) => i.id))
    },
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

export const RECIPES_KEY = ['recipes'] as const

const byRecipeName = (a: RecipeFull, b: RecipeFull) => a.name.localeCompare(b.name, 'fr')
const withItems = (
  list: RecipeFull[],
  recipeId: string,
  change: (items: RecipeItem[]) => RecipeItem[],
) =>
  list.map((r) =>
    r.id === recipeId
      ? { ...r, items: change(r.items).sort((a, b) => a.position - b.position) }
      : r,
  )

export type NewIngredient = Omit<RecipeItem, 'id' | 'created_at' | 'recipe_id' | 'position'>

/**
 * Recettes et repas types, ingrédients compris, dans un seul cache : toutes leurs écritures
 * partent dans l'ordre (la recette avant ses ingrédients, l'aliment avant l'ingrédient qui le cite).
 */
export function useRecipes({ onError }: Options = {}) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: RECIPES_KEY, queryFn: fetchRecipes })
  const recipes = query.data ?? []

  const addFoodsToCache = (foods: Food[]) => {
    if (foods.length === 0) return
    queryClient.setQueryData<Food[]>(FOODS_KEY, (old) =>
      [...(old ?? []).filter((f) => !foods.some((n) => n.id === f.id)), ...foods].sort(byName),
    )
  }

  const create = useOptimisticMutation<RecipeFull, { recipe: RecipeFull; newFoods: Food[] }>(
    RECIPES_KEY,
    async ({ recipe, newFoods }) => {
      for (const food of newFoods) await insertFood(food)
      await insertRecipe(recipe)
      await insertRecipeItems(recipe.items)
    },
    (list, { recipe }) => [...list.filter((r) => r.id !== recipe.id), recipe].sort(byRecipeName),
    onError,
    [FOODS_KEY],
  )
  const update = useOptimisticMutation<RecipeFull, { id: string; patch: RecipePatch }>(
    RECIPES_KEY,
    ({ id, patch }) => patchRecipe(id, patch),
    (list, { id, patch }) =>
      list.map((r) => (r.id === id ? { ...r, ...patch } : r)).sort(byRecipeName),
    onError,
  )
  const remove = useOptimisticMutation<RecipeFull, string>(
    RECIPES_KEY,
    removeRecipe,
    (list, id) => list.filter((r) => r.id !== id),
    onError,
    [MEAL_ITEMS_ALL],
  )
  const addIngredientM = useOptimisticMutation<RecipeFull, { item: RecipeItem; newFood?: Food }>(
    RECIPES_KEY,
    async ({ item, newFood }) => {
      if (newFood) await insertFood(newFood)
      await insertRecipeItems([item])
    },
    (list, { item }) =>
      withItems(list, item.recipe_id, (items) => [...items.filter((i) => i.id !== item.id), item]),
    onError,
    [FOODS_KEY],
  )
  const updateIngredientM = useOptimisticMutation<
    RecipeFull,
    { item: RecipeItem; patch: RecipeItemPatch }
  >(
    RECIPES_KEY,
    ({ item, patch }) => patchRecipeItem(item.id, patch),
    (list, { item, patch }) =>
      withItems(list, item.recipe_id, (items) =>
        items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)),
      ),
    onError,
  )
  const removeIngredientM = useOptimisticMutation<RecipeFull, RecipeItem>(
    RECIPES_KEY,
    (item) => removeRecipeItem(item.id),
    (list, item) =>
      withItems(list, item.recipe_id, (items) => items.filter((i) => i.id !== item.id)),
    onError,
  )

  const makeItem = (recipeId: string, input: NewIngredient, position: number): RecipeItem => ({
    id: crypto.randomUUID(),
    recipe_id: recipeId,
    position,
    created_at: new Date().toISOString(),
    ...input,
  })

  return {
    recipes,
    isLoading: query.isPending,
    /** Crée une recette (éventuellement avec ses ingrédients) ; renvoie la recette. */
    createRecipe: (
      name: string,
      servings: number,
      ingredients: NewIngredient[] = [],
      newFoods: Food[] = [],
    ): RecipeFull => {
      const id = crypto.randomUUID()
      const recipe: RecipeFull = {
        id,
        name,
        servings,
        created_at: new Date().toISOString(),
        items: ingredients.map((input, i) => makeItem(id, input, i)),
      }
      addFoodsToCache(newFoods)
      create.mutate({ recipe, newFoods })
      return recipe
    },
    updateRecipe: (id: string, patch: RecipePatch) => update.mutate({ id, patch }),
    /** Supprime la recette ; renvoie l'annulation (la recette revient avec ses ingrédients). */
    deleteRecipe: (recipe: RecipeFull): (() => void) => {
      remove.mutate(recipe.id)
      return () => create.mutate({ recipe, newFoods: [] })
    },
    addIngredient: (recipe: RecipeFull, input: NewIngredient, newFood?: Food) => {
      const position = recipe.items.reduce((m, i) => Math.max(m, i.position), -1) + 1
      if (newFood) addFoodsToCache([newFood])
      addIngredientM.mutate({ item: makeItem(recipe.id, input, position), newFood })
    },
    updateIngredient: (item: RecipeItem, patch: RecipeItemPatch) =>
      updateIngredientM.mutate({ item, patch }),
    /** Retire un ingrédient ; renvoie l'annulation. */
    removeIngredient: (item: RecipeItem): (() => void) => {
      removeIngredientM.mutate(item)
      return () => addIngredientM.mutate({ item })
    },
  }
}
