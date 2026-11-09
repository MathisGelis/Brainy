import type { DayCheckin } from '@/features/checkins/types'
import { isDayDone, isScheduled } from '@/features/habits/habitLogic'
import type { DayEntries, Habit } from '@/features/habits/types'
import type { Todo } from '@/features/todos/types'
import { addDays, startOfWeek, todayISO } from '@/lib/dates'

/** Jour (Europe/Paris) d'un horodatage ISO. */
const dayOf = (timestamp: string) => todayISO(new Date(timestamp))

/** Todos terminées chacun des `n` derniers jours (aujourd'hui en dernier), et total des `n` jours d'avant. */
export function todosLastDays(todos: Todo[], today: string, n = 7) {
  const done = new Map<string, number>()
  for (const t of todos)
    if (t.done && t.done_at) {
      const d = dayOf(t.done_at)
      done.set(d, (done.get(d) ?? 0) + 1)
    }
  const days = Array.from({ length: n }, (_, i) => {
    const day = addDays(today, i - n + 1)
    return { day, value: done.get(day) ?? 0 }
  })
  const before = Array.from({ length: n }, (_, i) => done.get(addDays(today, i - 2 * n + 1)) ?? 0)
  return {
    days,
    total: days.reduce((s, d) => s + d.value, 0),
    previous: before.reduce((s, v) => s + v, 0),
  }
}

export type HabitDay = { day: string; done: number; total: number; future: boolean }

/**
 * Habitudes d'un jour. Une habitude quotidienne ou à jours précis compte quand elle est prévue ;
 * une habitude « X fois par semaine » ne compte que le jour où elle est faite (un bonus, pas un dû).
 */
export function habitDay(
  habits: Habit[],
  entries: Map<string, DayEntries>,
  day: string,
  today: string,
): HabitDay {
  let done = 0
  let total = 0
  for (const h of habits) {
    if (h.archived || h.created_at.slice(0, 10) > day) continue
    const e = entries.get(h.id) ?? new Map<string, number | null>()
    const isDone = isDayDone(h, e, day)
    const due = h.days ? isScheduled(h, day) : h.target_per_week >= 7
    if (due || isDone) total++
    if (isDone) done++
  }
  return { day, done, total, future: day > today }
}

/** Grille des `weeks` dernières semaines (lundi → dimanche), la semaine en cours à droite. */
export function habitGrid(
  habits: Habit[],
  entries: Map<string, DayEntries>,
  today: string,
  weeks = 12,
): HabitDay[][] {
  const firstMonday = addDays(startOfWeek(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) =>
      habitDay(habits, entries, addDays(firstMonday, w * 7 + d), today),
    ),
  )
}

/** Niveau de 0 (rien) à 4 (tout fait) pour la carte de chaleur. */
export function heatLevel(cell: Pick<HabitDay, 'done' | 'total'>): 0 | 1 | 2 | 3 | 4 {
  if (cell.total === 0 || cell.done === 0) return 0
  const r = cell.done / cell.total
  return r >= 1 ? 4 : r >= 0.75 ? 3 : r >= 0.5 ? 2 : 1
}

/** Part des habitudes faites sur des jours donnés (jours à venir exclus) ; null s'il n'y avait rien à faire. */
export function habitRate(cells: HabitDay[]): number | null {
  const past = cells.filter((c) => !c.future)
  const total = past.reduce((s, c) => s + c.total, 0)
  return total === 0 ? null : past.reduce((s, c) => s + c.done, 0) / total
}

export type MoodPoint = { day: string; mood: number | null; energy: number | null }

/** Humeur et énergie des `n` derniers jours (null quand rien n'a été noté). */
export function moodSeries(checkins: DayCheckin[], today: string, n = 30): MoodPoint[] {
  const byDay = new Map(checkins.map((c) => [c.day, c]))
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(today, i - n + 1)
    const c = byDay.get(day)
    return { day, mood: c?.mood ?? null, energy: c?.energy ?? null }
  })
}

/** Moyenne des valeurs notées ; null si aucune. */
export function mean(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null)
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}
