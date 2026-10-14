import { supabase } from '@/lib/supabase'
import type { Note, NotePatch } from './types'

export async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as Note[]
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
