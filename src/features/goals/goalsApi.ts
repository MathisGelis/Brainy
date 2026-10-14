import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type { Goal, GoalPatch, Milestone, MilestonePatch } from './types'

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase.from('goals').select('*').order('created_at')
  if (error) throw error
  return data as Goal[]
}

export async function fetchMilestones(): Promise<Milestone[]> {
  return fetchAllRows<Milestone>((from, to) =>
    supabase
      .from('goal_milestones')
      .select('id, goal_id, title, done, position, created_at')
      .order('position')
      .order('id')
      .range(from, to),
  )
}

export async function insertGoal(goal: Goal): Promise<void> {
  const { error } = await supabase.from('goals').insert(goal)
  if (error) throw error
}

export async function patchGoal(id: string, patch: GoalPatch): Promise<void> {
  const { error } = await supabase.from('goals').update(patch).eq('id', id)
  if (error) throw error
}

/** Supprime l'objectif ; ses jalons partent en cascade côté base. */
export async function removeGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function insertMilestones(milestones: Milestone[]): Promise<void> {
  if (milestones.length === 0) return
  const { error } = await supabase.from('goal_milestones').insert(milestones)
  if (error) throw error
}

export async function patchMilestone(id: string, patch: MilestonePatch): Promise<void> {
  const { error } = await supabase.from('goal_milestones').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('goal_milestones').delete().eq('id', id)
  if (error) throw error
}
