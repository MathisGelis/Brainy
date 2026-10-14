import { useQuery } from '@tanstack/react-query'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import {
  fetchGoals,
  fetchMilestones,
  insertGoal,
  insertMilestones,
  patchGoal,
  patchMilestone,
  removeGoal,
  removeMilestone,
} from './goalsApi'
import type { Goal, GoalPatch, Horizon, Milestone, MilestonePatch } from './types'

export const GOALS_KEY = ['goals'] as const
export const MILESTONES_KEY = ['goal_milestones'] as const

export type NewGoalInput = { title: string; horizon: Horizon; target_date: string | null }

export function useGoals({ onError }: { onError?: (message: string) => void } = {}) {
  const goalsQuery = useQuery({ queryKey: GOALS_KEY, queryFn: fetchGoals })
  const milestonesQuery = useQuery({ queryKey: MILESTONES_KEY, queryFn: fetchMilestones })

  const addGoalM = useOptimisticMutation<Goal, Goal>(
    GOALS_KEY,
    insertGoal,
    (goals, goal) => [...goals.filter((g) => g.id !== goal.id), goal],
    onError,
  )
  const updateGoalM = useOptimisticMutation<Goal, { id: string; patch: GoalPatch }>(
    GOALS_KEY,
    ({ id, patch }) => patchGoal(id, patch),
    (goals, { id, patch }) =>
      goals.map((g) =>
        g.id === id ? { ...g, ...patch, updated_at: new Date().toISOString() } : g,
      ),
    onError,
  )
  const deleteGoalM = useOptimisticMutation<Goal, string>(
    GOALS_KEY,
    removeGoal,
    (goals, id) => goals.filter((g) => g.id !== id),
    onError,
  )
  const addMilestonesM = useOptimisticMutation<Milestone, Milestone[]>(
    MILESTONES_KEY,
    insertMilestones,
    (list, added) => {
      const ids = new Set(added.map((m) => m.id))
      return [...list.filter((m) => !ids.has(m.id)), ...added]
    },
    onError,
  )
  const updateMilestoneM = useOptimisticMutation<Milestone, { id: string; patch: MilestonePatch }>(
    MILESTONES_KEY,
    ({ id, patch }) => patchMilestone(id, patch),
    (list, { id, patch }) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    onError,
  )
  const deleteMilestoneM = useOptimisticMutation<Milestone, string>(
    MILESTONES_KEY,
    removeMilestone,
    (list, id) => list.filter((m) => m.id !== id),
    onError,
  )

  const goals = goalsQuery.data ?? []
  const milestones = milestonesQuery.data ?? []

  return {
    goals,
    milestones,
    isLoading: goalsQuery.isPending || milestonesQuery.isPending,
    isError: goalsQuery.isError || milestonesQuery.isError,
    refetch: () => Promise.all([goalsQuery.refetch(), milestonesQuery.refetch()]),

    addGoal: ({ title, horizon, target_date }: NewGoalInput) => {
      const now = new Date().toISOString()
      addGoalM.mutate({
        id: crypto.randomUUID(),
        title,
        description: null,
        horizon,
        target_date,
        status: 'active',
        created_at: now,
        updated_at: now,
      })
    },
    updateGoal: (id: string, patch: GoalPatch) => updateGoalM.mutate({ id, patch }),
    deleteGoal: (id: string) => deleteGoalM.mutate(id),
    /** Annulation d'une suppression : l'objectif d'abord, puis ses jalons (clé étrangère). */
    restoreGoal: (goal: Goal, goalMilestones: Milestone[]) =>
      addGoalM.mutate(goal, { onSuccess: () => addMilestonesM.mutate(goalMilestones) }),

    addMilestone: (goalId: string, title: string) => {
      const siblings = milestones.filter((m) => m.goal_id === goalId)
      addMilestonesM.mutate([
        {
          id: crypto.randomUUID(),
          goal_id: goalId,
          title,
          done: false,
          position: siblings.reduce((max, m) => Math.max(max, m.position), -1) + 1,
          created_at: new Date().toISOString(),
        },
      ])
    },
    updateMilestone: (id: string, patch: MilestonePatch) => updateMilestoneM.mutate({ id, patch }),
    deleteMilestone: (id: string) => deleteMilestoneM.mutate(id),
  }
}
