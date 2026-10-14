export type Priority = 'normal' | 'high'

export type Todo = {
  id: string
  list_id: string | null
  title: string
  done: boolean
  done_at: string | null
  due_date: string | null
  priority: Priority
  position: number
  created_at: string
}

export type TodoPatch = Partial<
  Pick<Todo, 'title' | 'done' | 'done_at' | 'due_date' | 'priority' | 'position'>
>

export type PositionUpdate = { id: string; position: number }

export type TodoFilter = 'today' | 'upcoming' | 'all' | 'done'
