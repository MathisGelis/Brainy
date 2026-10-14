import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type { Food, FoodPatch, MacroTargets, MealItem, MealItemPatch } from './types'

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
