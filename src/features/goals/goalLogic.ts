import type { Goal, GoalStatus, Horizon, LinkedTodo, Milestone, Progress } from './types'

export const HORIZONS: { value: Horizon; label: string }[] = [
  { value: 'short', label: 'Court terme (< 3 mois)' },
  { value: 'medium', label: 'Moyen terme' },
  { value: 'long', label: 'Long terme' },
]

export const STATUSES: { value: GoalStatus; label: string }[] = [
  { value: 'active', label: 'En cours' },
  { value: 'achieved', label: 'Atteint' },
  { value: 'abandoned', label: 'Abandonné' },
]

/**
 * Progression calculée (jamais stockée) : jalons + todos liées faits / total.
 * Les todos récurrentes liées n'y comptent pas (elles se renouvellent sans fin).
 */
export function goalProgress(milestones: Milestone[], linkedTodos: LinkedTodo[] = []): Progress {
  const todos = linkedTodos.filter((t) => !t.recurrence)
  const total = milestones.length + todos.length
  const done = milestones.filter((m) => m.done).length + todos.filter((t) => t.done).length
  return { done, total, ratio: total === 0 ? 0 : done / total }
}

/** Prochain jalon à faire (dans l'ordre manuel), s'il y en a un. */
export function nextMilestone(milestones: Milestone[], goalId: string): Milestone | undefined {
  return milestonesOf(milestones, goalId).find((m) => !m.done)
}

/** Jalons d'un objectif, dans l'ordre manuel. */
export function milestonesOf(milestones: Milestone[], goalId: string): Milestone[] {
  return milestones
    .filter((m) => m.goal_id === goalId)
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
}

/** Échéance la plus proche d'abord ; sans échéance à la fin, puis par date de création. */
const byTargetDate = (a: Goal, b: Goal) => {
  if (a.target_date !== b.target_date) {
    if (a.target_date === null) return 1
    if (b.target_date === null) return -1
    return a.target_date.localeCompare(b.target_date)
  }
  return a.created_at.localeCompare(b.created_at)
}

/** Objectifs en cours regroupés par horizon (groupes vides omis), et objectifs clos à part. */
export function groupGoals(goals: Goal[]): {
  active: { horizon: Horizon; label: string; goals: Goal[] }[]
  closed: Goal[]
} {
  const active = HORIZONS.map(({ value, label }) => ({
    horizon: value,
    label,
    goals: goals.filter((g) => g.status === 'active' && g.horizon === value).sort(byTargetDate),
  })).filter((group) => group.goals.length > 0)
  const closed = goals
    .filter((g) => g.status !== 'active')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return { active, closed }
}
