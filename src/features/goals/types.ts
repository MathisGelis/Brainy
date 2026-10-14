export type Horizon = 'short' | 'medium' | 'long'
export type GoalStatus = 'active' | 'achieved' | 'abandoned'

export type Goal = {
  id: string
  title: string
  description: string | null
  horizon: Horizon
  target_date: string | null
  status: GoalStatus
  created_at: string
  updated_at: string
}

export type GoalPatch = Partial<
  Pick<Goal, 'title' | 'description' | 'horizon' | 'target_date' | 'status'>
>

export type Milestone = {
  id: string
  goal_id: string
  title: string
  done: boolean
  /** Date de réalisation (revue de la semaine) */
  done_at: string | null
  position: number
  created_at: string
}

export type MilestonePatch = Partial<Pick<Milestone, 'title' | 'done' | 'done_at' | 'position'>>

/** Todo liée à un objectif (sous-ensemble utile au calcul de progression) */
export type LinkedTodo = { id: string; title: string; done: boolean; recurrence: string | null }

export type Progress = { done: number; total: number; ratio: number }
