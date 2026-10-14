export type Priority = 'normal' | 'high'

export type Todo = {
  id: string
  list_id: string | null
  goal_id: string | null
  title: string
  done: boolean
  done_at: string | null
  due_date: string | null
  priority: Priority
  /** 'daily' | 'weekly:1,3,5' | 'monthly' (voir recurrence.ts) */
  recurrence: string | null
  position: number
  created_at: string
}

export type TodoPatch = Partial<
  Pick<
    Todo,
    | 'title'
    | 'done'
    | 'done_at'
    | 'due_date'
    | 'priority'
    | 'position'
    | 'list_id'
    | 'goal_id'
    | 'recurrence'
  >
>

export type TodoList = { id: string; name: string; position: number }

export type PositionUpdate = { id: string; position: number }

export type TodoFilter = 'today' | 'upcoming' | 'all' | 'done'
