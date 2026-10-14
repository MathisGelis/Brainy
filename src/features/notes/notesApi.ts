import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type { Note, NotePatch } from './types'

export async function fetchNotes(): Promise<Note[]> {
  return fetchAllRows<Note>((from, to) =>
    supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })
      .order('id')
      .range(from, to),
  )
}

export async function insertNote(note: Note): Promise<void> {
  const { error } = await supabase.from('notes').insert(note)
  if (error) throw error
}

export async function patchNote(id: string, patch: NotePatch): Promise<void> {
  const { error } = await supabase.from('notes').update(patch).eq('id', id)
  if (error) throw error
}

export async function removeNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}
