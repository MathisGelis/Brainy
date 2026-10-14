export type Habit = {
  id: string
  name: string
  target_per_week: number
  archived: boolean
  position: number
  created_at: string
}

export type HabitPatch = Partial<Pick<Habit, 'name' | 'target_per_week' | 'archived'>>

export type HabitLog = { id: string; habit_id: string; day: string }

export type Streak = { count: number; unit: 'day' | 'week' }

export type HeatCell = { day: string; done: boolean; future: boolean }
