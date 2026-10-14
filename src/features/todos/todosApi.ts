import { fetchAllRows } from '@/lib/fetchAllRows'
import { supabase } from '@/lib/supabase'
import type { PositionUpdate, Todo, TodoPatch } from './types'

// `user_id` est rempli côté base (default auth.uid()) et protégé par la RLS.

export async function fetchTodos(): Promise<Todo[]> {
  return fetchAllRows<Todo>((from, to) =>
    supabase
      .from('todos')
      .select('*')
      .order('position')
      .order('created_at')
      .order('id')
      .range(from, to),
  )
}

/** L'id est fourni par le client pour que la mise à jour optimiste reste stable. */
export async function insertTodo(todo: Todo): Promise<void> {
  const { error } = await supabase.from('todos').insert(todo)
  if (error) throw error
}

export async function patchTodo(id: string, patch: TodoPatch): Promise<void> {
  const { error } = await supabase.from('todos').update(patch).eq('id', id)
  if (error) throw error
}

export async function patchPositions(updates: PositionUpdate[]): Promise<void> {
  await Promise.all(updates.map((u) => patchTodo(u.id, { position: u.position })))
}

export async function removeTodo(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) throw error
}
