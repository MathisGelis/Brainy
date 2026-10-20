import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type { CalendarEvent, EventPatch } from './types'

// `user_id` est rempli côté base (default auth.uid()) et protégé par la RLS.

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return fetchAllRows<CalendarEvent>((from, to) =>
    supabase.from('events').select('*').order('start_on').order('id').range(from, to),
  )
}

/** L'id est fourni par le client pour que la mise à jour optimiste reste stable. */
export async function insertEvent(event: CalendarEvent): Promise<void> {
  const { error } = await supabase.from('events').insert(event)
  if (error) throw error
}

export async function patchEvent(id: string, patch: EventPatch): Promise<void> {
  const { error } = await supabase.from('events').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}
