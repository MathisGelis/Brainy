import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type { MovePatch, SavingsGoal, SavingsMove, SavingsPatch } from './types'

export async function fetchSavings(): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .order('position')
    .order('created_at')
  if (error) throw error
  return data as SavingsGoal[]
}

export async function insertSavings(goal: SavingsGoal): Promise<void> {
  const { error } = await supabase.from('savings_goals').insert(goal)
  if (error) throw error
}

export async function patchSavings(id: string, patch: SavingsPatch): Promise<void> {
  const { error } = await supabase.from('savings_goals').update(patch).eq('id', id)
  if (error) throw error
}

/** Supprime la cagnotte ; ses mouvements partent en cascade côté base. */
export async function removeSavings(id: string): Promise<void> {
  const { error } = await supabase.from('savings_goals').delete().eq('id', id)
  if (error) throw error
}

/** Tous les mouvements : quelques-uns par mois, de quoi calculer les soldes côté client. */
export async function fetchMoves(): Promise<SavingsMove[]> {
  return fetchAllRows<SavingsMove>((from, to) =>
    supabase
      .from('savings_moves')
      .select('*')
      .order('moved_on', { ascending: false })
      .order('id')
      .range(from, to),
  )
}

export async function insertMoves(moves: SavingsMove[]): Promise<void> {
  if (moves.length === 0) return
  const { error } = await supabase.from('savings_moves').insert(moves)
  if (error) throw error
}

export async function patchMove(id: string, patch: MovePatch): Promise<void> {
  const { error } = await supabase.from('savings_moves').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeMove(id: string): Promise<void> {
  const { error } = await supabase.from('savings_moves').delete().eq('id', id)
  if (error) throw error
}
