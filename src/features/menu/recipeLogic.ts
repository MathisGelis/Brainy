import { MEALS, normalizeName, type ParsedFood } from './nutrition'
import type { Macros, Meal, MealItem, RecipeFull, RecipeItem } from './types'

type Values = Macros & { grams: number }

/** Total des ingrédients (poids et valeurs). */
export function recipeTotals(items: Pick<RecipeItem, keyof Values>[]): Values {
  return items.reduce(
    (t, i) => ({
      grams: t.grams + i.grams,
      kcal: t.kcal + i.kcal,
      protein_dg: t.protein_dg + i.protein_dg,
      carbs_dg: t.carbs_dg + i.carbs_dg,
      fat_dg: t.fat_dg + i.fat_dg,
    }),
    { grams: 0, kcal: 0, protein_dg: 0, carbs_dg: 0, fat_dg: 0 },
  )
}

/** Valeurs pour un nombre de parts (arrondies : grammes, kcal, dixièmes de gramme). */
export function forParts(recipe: RecipeFull, parts: number): Values {
  const t = recipeTotals(recipe.items)
  const k = parts / recipe.servings
  return {
    grams: Math.max(1, Math.round(t.grams * k)),
    kcal: Math.round(t.kcal * k),
    protein_dg: Math.round(t.protein_dg * k),
    carbs_dg: Math.round(t.carbs_dg * k),
    fat_dg: Math.round(t.fat_dg * k),
  }
}

/** Parts voulues : « 2 parts » (compte), « 300 g » (au poids d'une part), sinon une part. */
export function partsFor(parsed: Pick<ParsedFood, 'grams' | 'count'>, recipe: RecipeFull): number {
  if (parsed.count !== null) return parsed.count
  if (parsed.grams !== null) {
    const perPart = recipeTotals(recipe.items).grams / recipe.servings
    if (perPart > 0) return Math.max(0.25, Math.round((parsed.grams / perPart) * 4) / 4)
  }
  return 1
}

/** Élément de repas tiré d'une recette : une ligne, au nom de la recette. */
export function recipeMealItem(
  recipe: RecipeFull,
  parts: number,
  day: string,
  meal: Meal,
): Omit<MealItem, 'id' | 'created_at' | 'position'> {
  return {
    day,
    meal,
    food_id: null,
    recipe_id: recipe.id,
    name: recipe.name,
    ...forParts(recipe, parts),
  }
}

/** Recettes dont le nom correspond à la recherche (début, ou tous les mots). */
export function searchRecipes(query: string, recipes: RecipeFull[]): RecipeFull[] {
  const q = normalizeName(query)
  if (q.length < 2) return []
  const words = q.split(' ')
  return recipes
    .map((r) => ({ r, n: normalizeName(r.name) }))
    .filter(
      ({ n }) => n.startsWith(q) || words.every((w) => n.split(' ').some((x) => x.startsWith(w))),
    )
    .sort((a, b) => Number(!a.n.startsWith(q)) - Number(!b.n.startsWith(q)))
    .map(({ r }) => r)
}

/** Noms à acheter pour des éléments de repas : les ingrédients pour une recette, sinon l'aliment. */
export function shoppingNames(items: MealItem[], recipes: RecipeFull[]): string[] {
  return items.flatMap((i) => {
    if (!i.recipe_id) return [i.name]
    const recipe = recipes.find((r) => r.id === i.recipe_id)
    return recipe ? recipe.items.map((x) => x.name) : []
  })
}

/** Ingrédients d'un repas type tirés des éléments d'un repas du menu (valeurs reprises telles quelles). */
export function ingredientsFromMeal(
  items: MealItem[],
): Omit<RecipeItem, 'id' | 'created_at' | 'recipe_id' | 'position'>[] {
  return items.map((i) => ({
    food_id: i.food_id,
    name: i.name,
    grams: i.grams,
    kcal: i.kcal,
    protein_dg: i.protein_dg,
    carbs_dg: i.carbs_dg,
    fat_dg: i.fat_dg,
  }))
}

const mealOrder = (meal: Meal) => MEALS.findIndex((m) => m.id === meal)

/**
 * Copie d'éléments de repas vers d'autres jours (`shift` jours plus tard),
 * placés après ce qui existe déjà dans chaque repas.
 */
export function copyMealItems(
  source: MealItem[],
  shift: (day: string) => string,
  existing: MealItem[],
  makeId: () => string = () => crypto.randomUUID(),
  now: string = new Date().toISOString(),
): MealItem[] {
  const next = new Map<string, number>()
  const slot = (day: string, meal: Meal) => {
    const key = `${day}|${meal}`
    if (!next.has(key)) {
      const max = existing
        .filter((i) => i.day === day && i.meal === meal)
        .reduce((m, i) => Math.max(m, i.position), -1)
      next.set(key, max + 1)
    }
    const position = next.get(key)!
    next.set(key, position + 1)
    return position
  }
  return [...source]
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        mealOrder(a.meal) - mealOrder(b.meal) ||
        a.position - b.position,
    )
    .map((i) => {
      const day = shift(i.day)
      return { ...i, id: makeId(), day, position: slot(day, i.meal), created_at: now }
    })
}
