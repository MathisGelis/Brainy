import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type {
  Food,
  FoodPatch,
  MacroTargets,
  MealItem,
  MealItemPatch,
  Recipe,
  RecipeFull,
  RecipeItem,
  RecipeItemPatch,
  RecipePatch,
} from './types'

export async function fetchFoods(): Promise<Food[]> {
  return fetchAllRows<Food>((from, to) =>
    supabase.from('foods').select('*').order('name').order('id').range(from, to),
  )
}

export async function insertFood(food: Food): Promise<void> {
  const { error } = await supabase.from('foods').insert(food)
  if (error) throw error
}

export async function patchFood(id: string, patch: FoodPatch): Promise<void> {
  const { error } = await supabase.from('foods').update(patch).eq('id', id)
  if (error) throw error
}

/** Supprime l'aliment ; les repas passés gardent leurs valeurs (lien remis à null). */
export async function removeFood(id: string): Promise<void> {
  const { error } = await supabase.from('foods').delete().eq('id', id)
  if (error) throw error
}

export async function fetchMealItems(from: string, to: string): Promise<MealItem[]> {
  return fetchAllRows<MealItem>((start, end) =>
    supabase
      .from('meal_items')
      .select('*')
      .gte('day', from)
      .lte('day', to)
      .order('day')
      .order('position')
      .order('created_at')
      .range(start, end),
  )
}

export async function insertMealItems(items: MealItem[]): Promise<void> {
  if (items.length === 0) return
  const { error } = await supabase.from('meal_items').insert(items)
  if (error) throw error
}

export async function patchMealItem(id: string, patch: MealItemPatch): Promise<void> {
  const { error } = await supabase.from('meal_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeMealItem(id: string): Promise<void> {
  const { error } = await supabase.from('meal_items').delete().eq('id', id)
  if (error) throw error
}

/** Retire plusieurs éléments d'un coup (annulation d'une copie de menu). */
export async function removeMealItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('meal_items').delete().in('id', ids)
  if (error) throw error
}

/** Recettes et leurs ingrédients (deux lectures, regroupées ici). */
export async function fetchRecipes(): Promise<RecipeFull[]> {
  const [recipes, items] = await Promise.all([
    fetchAllRows<Recipe>((from, to) =>
      supabase.from('recipes').select('*').order('name').order('id').range(from, to),
    ),
    fetchAllRows<RecipeItem>((from, to) =>
      supabase
        .from('recipe_items')
        .select('*')
        .order('position')
        .order('created_at')
        .range(from, to),
    ),
  ])
  return recipes.map((r) => ({ ...r, items: items.filter((i) => i.recipe_id === r.id) }))
}

export async function insertRecipe(recipe: Recipe): Promise<void> {
  const { id, name, servings, created_at } = recipe // jamais la liste d'ingrédients du cache
  const { error } = await supabase.from('recipes').insert({ id, name, servings, created_at })
  if (error) throw error
}

export async function patchRecipe(id: string, patch: RecipePatch): Promise<void> {
  const { error } = await supabase.from('recipes').update(patch).eq('id', id)
  if (error) throw error
}

/** Supprime la recette et ses ingrédients (cascade) ; les repas passés gardent leurs valeurs. */
export async function removeRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

export async function insertRecipeItems(items: RecipeItem[]): Promise<void> {
  if (items.length === 0) return
  const { error } = await supabase.from('recipe_items').insert(items)
  if (error) throw error
}

export async function patchRecipeItem(id: string, patch: RecipeItemPatch): Promise<void> {
  const { error } = await supabase.from('recipe_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeRecipeItem(id: string): Promise<void> {
  const { error } = await supabase.from('recipe_items').delete().eq('id', id)
  if (error) throw error
}

export async function fetchTargets(): Promise<MacroTargets | null> {
  const { data, error } = await supabase
    .from('macro_targets')
    .select('kcal, protein_g, carbs_g, fat_g')
    .maybeSingle()
  if (error) throw error
  return (data as MacroTargets | null) ?? null
}

/** Une ligne par utilisateur : crée ou remplace les objectifs. */
export async function upsertTargets(targets: MacroTargets): Promise<void> {
  const { error } = await supabase
    .from('macro_targets')
    .upsert({ ...targets, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}
