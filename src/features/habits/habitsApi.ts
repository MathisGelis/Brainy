import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type { DayOff, Habit, HabitLog, HabitPatch } from './types'

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
  return fetchAllRows<HabitLog>((from, to) =>
    supabase
      .from('habit_logs')
      .select('*')
      .gte('day', since)
      .order('day')
      .order('id')
      .range(from, to),
  )
}

/** Tout l'historique d'une habitude (pour pouvoir annuler sa suppression). */
export async function fetchHabitLogs(habitId: string): Promise<HabitLog[]> {
  return fetchAllRows<HabitLog>((from, to) =>
    supabase.from('habit_logs').select('*').eq('habit_id', habitId).order('day').range(from, to),
  )
}

export async function insertHabit(habit: Habit): Promise<void> {
  const { error } = await supabase.from('habits').insert(habit)
  if (error) throw error
}

export async function patchHabit(id: string, patch: HabitPatch): Promise<void> {
  const { error } = await supabase.from('habits').update(patch).eq('id', id)
  if (error) throw error
}

/** Supprime l'habitude ; ses logs partent en cascade côté base. */
export async function removeHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) throw error
}

export async function insertLogs(logs: HabitLog[]): Promise<void> {
  if (logs.length === 0) return
  const { error } = await supabase.from('habit_logs').insert(logs)
  if (error) throw error
}

export async function updateLogAmount(
  habitId: string,
  day: string,
  amount: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('habit_logs')
    .update({ amount })
    .eq('habit_id', habitId)
    .eq('day', day)
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

// Jours off

export async function fetchDaysOff(since: string): Promise<DayOff[]> {
  const { data, error } = await supabase
    .from('habit_days_off')
    .select('id, day')
    .gte('day', since)
    .order('day')
  if (error) throw error
  return data as DayOff[]
}

export async function insertDaysOff(rows: DayOff[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase
    .from('habit_days_off')
    .upsert(rows, { onConflict: 'user_id,day', ignoreDuplicates: true })
  if (error) throw error
}

export async function deleteDaysOff(days: string[]): Promise<void> {
  if (days.length === 0) return
  const { error } = await supabase.from('habit_days_off').delete().in('day', days)
  if (error) throw error
}
