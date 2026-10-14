import { supabase } from '@/lib/supabase'
import type { Habit, HabitLog, HabitPatch } from './types'

export async function fetchHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('position')
    .order('created_at')
  if (error) throw error
  return data as Habit[]
}

/** Logs depuis un jour donné (la heatmap couvre un an). */
export async function fetchLogs(since: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('id, habit_id, day')
    .gte('day', since)
  if (error) throw error
  return data as HabitLog[]
}

export async function insertHabit(habit: Habit): Promise<void> {
  const { error } = await supabase.from('habits').insert(habit)
  if (error) throw error
}

export async function patchHabit(id: string, patch: HabitPatch): Promise<void> {
  const { error } = await supabase.from('habits').update(patch).eq('id', id)
  if (error) throw error
}

export async function insertLog(log: HabitLog): Promise<void> {
  const { error } = await supabase.from('habit_logs').insert(log)
  if (error) throw error
}

export async function deleteLog(habitId: string, day: string): Promise<void> {
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('day', day)
  if (error) throw error
}
