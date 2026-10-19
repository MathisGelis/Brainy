import { useQuery, useQueryClient } from '@tanstack/react-query'
import { todayISO } from '@/lib/dates'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import {
  fetchMoves,
  fetchSavings,
  insertMoves,
  insertSavings,
  patchMove,
  patchSavings,
  removeMove,
  removeSavings,
} from './savingsApi'
import { balanceOf, byMoveDateDesc } from './savingsLogic'
import type { MovePatch, SavingsGoal, SavingsMove, SavingsPatch } from './types'

export const SAVINGS_KEY = ['savings_goals'] as const
export const MOVES_KEY = ['savings_moves'] as const

const byPosition = (a: SavingsGoal, b: SavingsGoal) =>
  a.position - b.position || a.created_at.localeCompare(b.created_at)

export type NewSavingsInput = { name: string; target_cents: number; goal_id: string | null }
export type NewMoveInput = {
  savings_id: string
  amount_cents: number
  moved_on?: string
  note?: string | null
}

export function useSavings({ onError }: { onError?: (message: string) => void } = {}) {
  const queryClient = useQueryClient()
  const goalsQuery = useQuery({ queryKey: SAVINGS_KEY, queryFn: fetchSavings })
  const movesQuery = useQuery({ queryKey: MOVES_KEY, queryFn: fetchMoves })

  const addGoalM = useOptimisticMutation<SavingsGoal, SavingsGoal>(
    SAVINGS_KEY,
    insertSavings,
    (list, g) => [...list, g].sort(byPosition),
    onError,
  )
  const updateGoalM = useOptimisticMutation<SavingsGoal, { id: string; patch: SavingsPatch }>(
    SAVINGS_KEY,
    ({ id, patch }) => patchSavings(id, patch),
    (list, { id, patch }) => list.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    onError,
  )
  const removeGoalM = useOptimisticMutation<SavingsGoal, string>(
    SAVINGS_KEY,
    removeSavings,
    (list, id) => list.filter((g) => g.id !== id),
    onError,
    [MOVES_KEY],
  )
  // Annulation : recréer la cagnotte puis ses mouvements, dans une seule requête
  const restoreGoalM = useOptimisticMutation<
    SavingsGoal,
    { goal: SavingsGoal; moves: SavingsMove[] }
  >(
    SAVINGS_KEY,
    async ({ goal, moves }) => {
      await insertSavings(goal)
      await insertMoves(moves)
    },
    (list, { goal }) => [...list.filter((g) => g.id !== goal.id), goal].sort(byPosition),
    onError,
    [MOVES_KEY],
  )

  const addMoveM = useOptimisticMutation<SavingsMove, SavingsMove>(
    MOVES_KEY,
    (m) => insertMoves([m]),
    (list, m) => [...list.filter((x) => x.id !== m.id), m].sort(byMoveDateDesc),
    onError,
  )
  const updateMoveM = useOptimisticMutation<SavingsMove, { id: string; patch: MovePatch }>(
    MOVES_KEY,
    ({ id, patch }) => patchMove(id, patch),
    (list, { id, patch }) =>
      list.map((m) => (m.id === id ? { ...m, ...patch } : m)).sort(byMoveDateDesc),
    onError,
  )
  const removeMoveM = useOptimisticMutation<SavingsMove, string>(
    MOVES_KEY,
    removeMove,
    (list, id) => list.filter((m) => m.id !== id),
    onError,
  )

  const goals = goalsQuery.data ?? []
  const moves = movesQuery.data ?? []

  return {
    goals,
    moves,
    balance: (savingsId: string) => balanceOf(moves, savingsId),
    isLoading: goalsQuery.isPending || movesQuery.isPending,
    isError: goalsQuery.isError || movesQuery.isError,
    refetch: () => Promise.all([goalsQuery.refetch(), movesQuery.refetch()]),

    addGoal: (input: NewSavingsInput) =>
      addGoalM.mutate({
        id: crypto.randomUUID(),
        archived: false,
        position: goals.reduce((max, g) => Math.max(max, g.position), -1) + 1,
        created_at: new Date().toISOString(),
        ...input,
      }),
    updateGoal: (id: string, patch: SavingsPatch) => updateGoalM.mutate({ id, patch }),
    /** Supprime la cagnotte et son historique ; renvoie l'annulation qui remet tout. */
    deleteGoal: (goal: SavingsGoal): (() => void) => {
      const own = moves.filter((m) => m.savings_id === goal.id)
      queryClient.setQueryData<SavingsMove[]>(MOVES_KEY, (old) =>
        old?.filter((m) => m.savings_id !== goal.id),
      )
      removeGoalM.mutate(goal.id)
      return () => {
        queryClient.setQueryData<SavingsMove[]>(MOVES_KEY, (old) =>
          [...(old ?? []).filter((m) => m.savings_id !== goal.id), ...own].sort(byMoveDateDesc),
        )
        restoreGoalM.mutate({ goal, moves: own })
      }
    },

    /** Versement (> 0) ou retrait (< 0) ; renvoie le mouvement créé. */
    addMove: (input: NewMoveInput): SavingsMove => {
      const move: SavingsMove = {
        id: crypto.randomUUID(),
        savings_id: input.savings_id,
        amount_cents: input.amount_cents,
        moved_on: input.moved_on ?? todayISO(),
        note: input.note ?? null,
        created_at: new Date().toISOString(),
      }
      addMoveM.mutate(move)
      return move
    },
    updateMove: (id: string, patch: MovePatch) => updateMoveM.mutate({ id, patch }),
    deleteMove: (id: string) => removeMoveM.mutate(id),
    /** Remet un mouvement supprimé (annulation), avec son id d'origine. */
    restoreMove: (move: SavingsMove) => addMoveM.mutate(move),
  }
}
