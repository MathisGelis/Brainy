import type { Todo } from '@/features/todos/types'
import { addDays, startOfWeek } from '@/lib/dates'
import { isoWeekday } from '@/lib/naturalDate'

/** Semaine à planifier : la suivante à partir du vendredi, sinon celle en cours. */
export function planningMonday(today: string): string {
  const monday = startOfWeek(today)
  return isoWeekday(today) >= 5 ? addDays(monday, 7) : monday
}

/** On propose de planifier du vendredi au lundi. */
export function isPlanningTime(today: string): boolean {
  const d = isoWeekday(today)
  return d >= 5 || d === 1
}

export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i))

/** Todos ouvertes en retard : à reprendre avant de planifier. */
export function overdueTodos(todos: Todo[], today: string): Todo[] {
  return todos
    .filter((t) => !t.done && t.due_date !== null && t.due_date < today)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!) || a.position - b.position)
}

/** Todos à répartir sur les jours : les todos ouvertes sans date, priorités de la semaine d'abord. */
export function toSchedule(todos: Todo[], monday: string): Todo[] {
  return todos
    .filter((t) => !t.done && t.due_date === null)
    .sort(
      (a, b) =>
        Number(b.focus_week === monday) - Number(a.focus_week === monday) ||
        a.position - b.position,
    )
}

/** Charge de chaque jour : nombre de todos ouvertes prévues ce jour-là. */
export function dayLoad(todos: Todo[], days: string[]): Map<string, number> {
  const load = new Map(days.map((d) => [d, 0]))
  for (const t of todos) {
    if (!t.done && t.due_date !== null && load.has(t.due_date)) {
      load.set(t.due_date, load.get(t.due_date)! + 1)
    }
  }
  return load
}
