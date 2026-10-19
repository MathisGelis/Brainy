export type Habit = {
  id: string
  name: string
  target_per_week: number
  /** Jours ISO planifiés (1 = lundi … 7 = dimanche) ; null = « X fois par semaine » */
  days: number[] | null
  /** Objectif chiffré du jour (ex. 8 verres) ; null = simple case à cocher */
  goal_amount: number | null
  unit: string | null
  goal_id: string | null
  archived: boolean
  position: number
  created_at: string
}

export type HabitPatch = Partial<
  Pick<Habit, 'name' | 'target_per_week' | 'days' | 'goal_amount' | 'unit' | 'goal_id' | 'archived'>
>

export type HabitLog = { id: string; habit_id: string; day: string; amount: number | null }

export type DayOff = { id: string; day: string }

/** Saisies d'une habitude : jour → quantité (null = simplement cochée) */
export type DayEntries = Map<string, number | null>

/** Ce qui définit le rythme attendu d'une habitude */
export type Schedule = Pick<Habit, 'target_per_week' | 'days' | 'goal_amount'>

export type Streak = { count: number; unit: 'day' | 'week' }

export type HeatCell = {
  day: string
  done: boolean
  /** Avancement pour une habitude chiffrée (0..1) */
  ratio: number
  future: boolean
  off: boolean
  scheduled: boolean
}
