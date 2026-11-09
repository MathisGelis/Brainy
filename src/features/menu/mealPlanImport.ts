import {
  fetchMealItems,
  insertFood,
  insertMealItems,
  insertRecipe,
  insertRecipeItems,
  patchFood,
  patchRecipe,
  removeMealItems,
  removeRecipeItem,
  upsertTargets,
} from './menuApi'
import type { ResolvedPlan } from './mealPlanResolve'
import type { MacroTargets } from './types'

/**
 * Écrit un plan lu, dans l'ordre des liens entre tables : aliments, recettes et ingrédients,
 * repas (après avoir retiré, si demandé, ceux déjà prévus ces jours-là), objectifs.
 */
export async function writeMealPlan(
  plan: ResolvedPlan,
  options: { replace: boolean; currentTargets: MacroTargets },
): Promise<void> {
  for (const food of plan.newFoods) await insertFood(food)
  for (const { id, patch } of plan.updatedFoods) await patchFood(id, patch)

  for (const { recipe, items, replaces } of plan.recipes) {
    if (replaces === null) await insertRecipe(recipe)
    else {
      await patchRecipe(recipe.id, { servings: recipe.servings })
      for (const old of replaces) await removeRecipeItem(old.id)
    }
    await insertRecipeItems(items)
  }

  if (options.replace && plan.days.length > 0) {
    const existing = await fetchMealItems(plan.days[0]!, plan.days.at(-1)!)
    const days = new Set(plan.days)
    await removeMealItems(existing.filter((m) => days.has(m.day)).map((m) => m.id))
  }
  await insertMealItems(plan.mealItems)

  if (plan.targets) await upsertTargets({ ...options.currentTargets, ...plan.targets })
}
