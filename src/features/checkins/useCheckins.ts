import { useQuery } from '@tanstack/react-query'
import { addDays, todayISO } from '@/lib/dates'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import { fetchCheckins, removeCheckin, upsertCheckin } from './checkinsApi'
import type { CheckinField, DayCheckin } from './types'

export const CHECKINS_KEY = ['day_checkins'] as const
/** Un peu plus d'un an : calendrier, revue et liens sur plusieurs semaines. */
const HISTORY_DAYS = 400

const byDay = (a: DayCheckin, b: DayCheckin) => a.day.localeCompare(b.day)

export function useCheckins({ onError }: { onError?: (message: string) => void } = {}) {
  const query = useQuery({
    queryKey: CHECKINS_KEY,
    queryFn: () => fetchCheckins(addDays(todayISO(), -HISTORY_DAYS)),
  })
  const save = useOptimisticMutation<DayCheckin, DayCheckin>(
    CHECKINS_KEY,
    upsertCheckin,
    (list, c) => [...list.filter((x) => x.day !== c.day), c].sort(byDay),
    onError,
  )
  const clear = useOptimisticMutation<DayCheckin, string>(
    CHECKINS_KEY,
    removeCheckin,
    (list, day) => list.filter((x) => x.day !== day),
    onError,
  )

  const checkins = query.data ?? []
  const checkinsByDay = new Map(checkins.map((c) => [c.day, c]))

  return {
    checkins,
    checkinsByDay,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    /** Fixe (ou retire, avec null) l'humeur ou l'énergie d'un jour ; une saisie vide est supprimée. */
    setValue: (day: string, field: CheckinField, value: number | null) => {
      const current = checkinsByDay.get(day) ?? { day, mood: null, energy: null }
      const next = { ...current, [field]: value }
      if (next.mood === null && next.energy === null) clear.mutate(day)
      else save.mutate(next)
    },
    /** Efface la saisie du jour ; renvoie l'annulation. */
    clearDay: (day: string): (() => void) => {
      const previous = checkinsByDay.get(day)
      if (!previous) return () => {}
      clear.mutate(day)
      return () => save.mutate(previous)
    },
  }
}
