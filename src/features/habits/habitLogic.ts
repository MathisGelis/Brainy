import { addDays, lastNDays, startOfWeek } from '@/lib/dates'
import type { HabitLog, HeatCell, Streak } from './types'

/** Regroupe les logs par habitude : habit_id → ensemble de jours cochés. */
export function groupLogs(logs: HabitLog[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const log of logs) {
    const days = map.get(log.habit_id) ?? new Set<string>()
    days.add(log.day)
    map.set(log.habit_id, days)
  }
  return map
}

/**
 * Série en cours. Habitude quotidienne (7/7) : jours consécutifs, la journée d'aujourd'hui
 * ne casse pas la série tant qu'elle n'est pas finie. Sinon : semaines (lundi→dimanche)
 * consécutives où l'objectif hebdomadaire est atteint ; la semaine en cours compte si elle est atteinte.
 */
export function currentStreak(days: Set<string>, today: string, targetPerWeek: number): Streak {
  if (targetPerWeek >= 7) {
    let cursor = days.has(today) ? today : addDays(today, -1)
    let count = 0
    while (days.has(cursor)) {
      count++
      cursor = addDays(cursor, -1)
    }
    return { count, unit: 'day' }
  }

  const weekCount = (monday: string) =>
    Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => days.has(d)).length

  let monday = startOfWeek(today)
  let count = 0
  if (weekCount(monday) >= targetPerWeek) count++
  monday = addDays(monday, -7)
  // Garde-fou : une série ne dépasse pas ~20 ans
  for (let i = 0; i < 1040 && weekCount(monday) >= targetPerWeek; i++) {
    count++
    monday = addDays(monday, -7)
  }
  return { count, unit: 'week' }
}

/** Taux de réussite sur 30 jours, entre 0 et 1, par rapport à l'objectif hebdomadaire. */
export function successRate30(days: Set<string>, today: string, targetPerWeek: number): number {
  const done = lastNDays(today, 30).filter((d) => days.has(d)).length
  const expected = (targetPerWeek * 30) / 7
  return Math.min(1, done / expected)
}

/** Grille de heatmap : colonnes = semaines (lundi→dimanche), `weeks` semaines se terminant à la semaine courante. */
export function heatmapWeeks(days: Set<string>, today: string, weeks = 53): HeatCell[][] {
  const firstMonday = addDays(startOfWeek(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(firstMonday, w * 7 + d)
      return { day, done: days.has(day), future: day > today }
    }),
  )
}
