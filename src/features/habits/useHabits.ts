import { useQuery } from '@tanstack/react-query'
import { addDays, todayISO } from '@/lib/dates'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import { deleteLog, fetchHabits, fetchLogs, insertHabit, insertLog, patchHabit } from './habitsApi'
import { groupLogs } from './habitLogic'
import type { Habit, HabitLog, HabitPatch } from './types'

export const HABITS_KEY = ['habits'] as const
export const LOGS_KEY = ['habit_logs'] as const

/** Les logs sont chargés sur environ un an (heatmap annuelle). */
const LOG_WINDOW_DAYS = 371

export function useHabits({ onError }: { onError?: (message: string) => void } = {}) {
  const habitsQuery = useQuery({ queryKey: HABITS_KEY, queryFn: fetchHabits })
  const logsQuery = useQuery({
    queryKey: LOGS_KEY,
    queryFn: () => fetchLogs(addDays(todayISO(), -LOG_WINDOW_DAYS)),
  })

  const add = useOptimisticMutation<Habit, Habit>(
    HABITS_KEY,
    insertHabit,
    (habits, habit) => [...habits, habit],
    onError,
  )
  const update = useOptimisticMutation<Habit, { id: string; patch: HabitPatch }>(
    HABITS_KEY,
    ({ id, patch }) => patchHabit(id, patch),
    (habits, { id, patch }) => habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    onError,
  )
  const setLog = useOptimisticMutation<
    HabitLog,
    { habitId: string; day: string; done: boolean; id: string }
  >(
    LOGS_KEY,
    ({ habitId, day, done, id }) =>
      done ? insertLog({ id, habit_id: habitId, day }) : deleteLog(habitId, day),
    (logs, { habitId, day, done, id }) =>
      done
        ? [...logs, { id, habit_id: habitId, day }]
        : logs.filter((l) => !(l.habit_id === habitId && l.day === day)),
    onError,
  )

  const habits = habitsQuery.data ?? []
  const logs = logsQuery.data ?? []
  const logDays = groupLogs(logs)

  return {
    habits,
    logDays,
    isLoading: habitsQuery.isPending || logsQuery.isPending,
    isError: habitsQuery.isError || logsQuery.isError,
    refetch: () => Promise.all([habitsQuery.refetch(), logsQuery.refetch()]),

    addHabit: (name: string, targetPerWeek: number) =>
      add.mutate({
        id: crypto.randomUUID(),
        name,
        target_per_week: targetPerWeek,
        archived: false,
        position: habits.reduce((max, h) => Math.max(max, h.position), -1) + 1,
        created_at: new Date().toISOString(),
      }),
    updateHabit: (id: string, patch: HabitPatch) => update.mutate({ id, patch }),
    /** Coche ou décoche un jour ; l'état courant est lu dans le cache. */
    toggleDay: (habitId: string, day: string) =>
      setLog.mutate({
        habitId,
        day,
        done: !logDays.get(habitId)?.has(day),
        id: crypto.randomUUID(),
      }),
  }
}
