import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type { DayCheckin } from './types'

export async function fetchCheckins(since: string): Promise<DayCheckin[]> {
  return fetchAllRows<DayCheckin>((from, to) =>
    supabase
      .from('day_checkins')
      .select('day, mood, energy')
      .gte('day', since)
      .order('day')
      .range(from, to),
  )
}

/** Une seule saisie par jour : crée ou remplace celle du jour. */
export async function upsertCheckin(checkin: DayCheckin): Promise<void> {
  const { error } = await supabase
    .from('day_checkins')
    .upsert(checkin, { onConflict: 'user_id,day' })
  if (error) throw error
}

export async function removeCheckin(day: string): Promise<void> {
  const { error } = await supabase.from('day_checkins').delete().eq('day', day)
  if (error) throw error
}
