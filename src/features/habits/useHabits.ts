import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, daysBetween, todayISO } from '@/lib/dates'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import {
  deleteDaysOff,
  deleteLog,
  fetchDaysOff,
  fetchHabitLogs,
  fetchHabits,
  fetchLogs,
  insertDaysOff,
  insertHabit,
  insertLogs,
  patchHabit,
  removeHabit,
  updateLogAmount,
} from './habitsApi'
import { groupLogs, isDayDone } from './habitLogic'
import type { DayOff, Habit, HabitLog, HabitPatch } from './types'

export const HABITS_KEY = ['habits'] as const
export const LOGS_KEY = ['habit_logs'] as const
export const DAYS_OFF_KEY = ['habit_days_off'] as const

/** Les logs sont chargés sur environ un an (heatmap annuelle). */
const LOG_WINDOW_DAYS = 371

type Options = { onError?: (message: string) => void }

export type NewHabitInput = Pick<
  Habit,
  'name' | 'target_per_week' | 'days' | 'goal_amount' | 'unit'
>

type LogChange =
  | { type: 'insert'; log: HabitLog }
  | { type: 'update'; habitId: string; day: string; amount: number | null }
  | { type: 'delete'; habitId: string; day: string }

export function useHabits({ onError }: Options = {}) {
  const queryClient = useQueryClient()
  const habitsQuery = useQuery({ queryKey: HABITS_KEY, queryFn: fetchHabits })
  const logsQuery = useQuery({
    queryKey: LOGS_KEY,
    queryFn: () => fetchLogs(addDays(todayISO(), -LOG_WINDOW_DAYS)),
  })

  const add = useOptimisticMutation<Habit, Habit>(
    HABITS_KEY,
    insertHabit,
    (habits, habit) => [...habits.filter((h) => h.id !== habit.id), habit],
    onError,
  )
  const update = useOptimisticMutation<Habit, { id: string; patch: HabitPatch }>(
    HABITS_KEY,
    ({ id, patch }) => patchHabit(id, patch),
    (habits, { id, patch }) => habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    onError,
  )
  const remove = useOptimisticMutation<Habit, string>(
    HABITS_KEY,
    removeHabit,
    (habits, id) => habits.filter((h) => h.id !== id),
    onError,
    [LOGS_KEY],
  )
  const changeLog = useOptimisticMutation<HabitLog, LogChange>(
    LOGS_KEY,
    (c) =>
      c.type === 'insert'
        ? insertLogs([c.log])
        : c.type === 'update'
          ? updateLogAmount(c.habitId, c.day, c.amount)
          : deleteLog(c.habitId, c.day),
    (logs, c) => {
      if (c.type === 'insert') return [...logs, c.log]
      const same = (l: HabitLog) => l.habit_id === c.habitId && l.day === c.day
      if (c.type === 'update') return logs.map((l) => (same(l) ? { ...l, amount: c.amount } : l))
      return logs.filter((l) => !same(l))
    },
    onError,
  )
  // Les étapes enchaînées vivent dans la requête : elle va au bout même si l'écran a changé
  // (les rappels de `mutate()` sont ignorés une fois le composant démonté).
  const restore = useOptimisticMutation<Habit, { habit: Habit; history: HabitLog[] }>(
    HABITS_KEY,
    async ({ habit, history }) => {
      await insertHabit(habit)
      await insertLogs(history)
    },
    (habits, { habit }) => [...habits.filter((h) => h.id !== habit.id), habit],
    onError,
    [LOGS_KEY],
  )

  const habits = habitsQuery.data ?? []
  const logs = logsQuery.data ?? []
  const entries = groupLogs(logs)
  const hasLog = (habitId: string, day: string) => entries.get(habitId)?.has(day) ?? false

  /** Fixe la quantité du jour (0 ou null pour une habitude simple : retire la saisie). */
  const setAmount = (habit: Habit, day: string, amount: number | null) => {
    const clear = habit.goal_amount ? !amount || amount <= 0 : amount === 0
    if (clear) {
      if (hasLog(habit.id, day)) changeLog.mutate({ type: 'delete', habitId: habit.id, day })
    } else if (hasLog(habit.id, day)) {
      changeLog.mutate({ type: 'update', habitId: habit.id, day, amount })
    } else {
      changeLog.mutate({
        type: 'insert',
        log: { id: crypto.randomUUID(), habit_id: habit.id, day, amount },
      })
    }
  }

  return {
    habits,
    entries,
    isLoading: habitsQuery.isPending || logsQuery.isPending,
    isError: habitsQuery.isError || logsQuery.isError,
    refetch: () => Promise.all([habitsQuery.refetch(), logsQuery.refetch()]),

    addHabit: (input: NewHabitInput) =>
      add.mutate({
        id: crypto.randomUUID(),
        goal_id: null,
        archived: false,
        position: habits.reduce((max, h) => Math.max(max, h.position), -1) + 1,
        created_at: new Date().toISOString(),
        ...input,
      }),
    updateHabit: (id: string, patch: HabitPatch) => update.mutate({ id, patch }),
    setAmount,
    /**
     * Coche / décoche un jour. Habitude chiffrée : « fait » remplit l'objectif du jour,
     * un jour déjà fait est remis à zéro.
     */
    toggleDay: (habit: Habit, day: string) => {
      const done = isDayDone(habit, entries.get(habit.id) ?? new Map(), day)
      if (done) changeLog.mutate({ type: 'delete', habitId: habit.id, day })
      else setAmount(habit, day, habit.goal_amount ?? null)
    },
    /**
     * Supprime l'habitude et tout son historique. Renvoie l'annulation,
     * qui recrée l'habitude puis ses saisies (relues avant suppression).
     */
    deleteHabit: async (habit: Habit): Promise<() => void> => {
      const history = await fetchHabitLogs(habit.id)
      queryClient.setQueryData<HabitLog[]>(LOGS_KEY, (old) =>
        old?.filter((l) => l.habit_id !== habit.id),
      )
      remove.mutate(habit.id)
      return () => {
        queryClient.setQueryData<HabitLog[]>(LOGS_KEY, (old) => [...(old ?? []), ...history])
        restore.mutate({ habit, history })
      }
    },
  }
}

export function useDaysOff({ onError }: Options = {}) {
  const query = useQuery({
    queryKey: DAYS_OFF_KEY,
    queryFn: () => fetchDaysOff(addDays(todayISO(), -LOG_WINDOW_DAYS)),
  })
  const add = useOptimisticMutation<DayOff, DayOff[]>(
    DAYS_OFF_KEY,
    insertDaysOff,
    (list, rows) =>
      [...list.filter((d) => !rows.some((r) => r.day === d.day)), ...rows].sort((a, b) =>
        a.day.localeCompare(b.day),
      ),
    onError,
  )
  const remove = useOptimisticMutation<DayOff, string[]>(
    DAYS_OFF_KEY,
    deleteDaysOff,
    (list, days) => list.filter((d) => !days.includes(d.day)),
    onError,
  )
  const list = query.data ?? []
  const offDays = new Set(list.map((d) => d.day))

  return {
    daysOff: list,
    offDays,
    /** Ajoute une période (bornes incluses, 366 jours max). */
    addPeriod: (from: string, to: string) => {
      const [start, end] = from <= to ? [from, to] : [to, from]
      const count = Math.min(daysBetween(start, end), 365) + 1
      const days = Array.from({ length: count }, (_, i) => addDays(start, i)).filter(
        (d) => !offDays.has(d),
      )
      add.mutate(days.map((day) => ({ id: crypto.randomUUID(), day })))
    },
    removeDays: (days: string[]) => remove.mutate(days),
    toggleDay: (day: string) =>
      offDays.has(day) ? remove.mutate([day]) : add.mutate([{ id: crypto.randomUUID(), day }]),
  }
}
