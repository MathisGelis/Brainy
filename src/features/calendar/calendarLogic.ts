import type { Expense } from '@/features/budget/types'
import type { DayCheckin } from '@/features/checkins/types'
import type { Goal, Milestone } from '@/features/goals/types'
import { isDayDone } from '@/features/habits/habitLogic'
import type { DayEntries, Habit } from '@/features/habits/types'
import type { Todo } from '@/features/todos/types'
import { addDays, monthBounds, startOfWeek, todayISO } from '@/lib/dates'

/** Jours affichés pour un mois : du lundi précédant le 1er au dimanche suivant le dernier jour. */
export function monthGrid(month: string): string[] {
  const { from, to } = monthBounds(month)
  const start = startOfWeek(from)
  const end = addDays(startOfWeek(addDays(to, -1)), 6)
  const days: string[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  return days
}

export type DaySummary = {
  /** Todos à faire ce jour-là (échéance), encore ouvertes */
  todosOpen: number
  /** Todos terminées ce jour-là */
  todosDone: number
  habitsDone: number
  spent: number
  /** Jalons atteints ce jour-là */
  milestones: number
  /** Objectifs dont c'est la date cible */
  goalsDue: number
  mood: number | null
  energy: number | null
  /** Une victoire a été notée ce jour-là */
  win: boolean
}

const empty = (): DaySummary => ({
  todosOpen: 0,
  todosDone: 0,
  habitsDone: 0,
  spent: 0,
  milestones: 0,
  goalsDue: 0,
  mood: null,
  energy: null,
  win: false,
})

/** Jour (Europe/Paris) d'un horodatage ISO. */
const dayOf = (timestamp: string) => todayISO(new Date(timestamp))

/** Résumé de chaque jour de `days` : de quoi remplir une case du calendrier. */
export function summarizeDays(
  days: string[],
  data: {
    todos: Todo[]
    habits: Habit[]
    entries: Map<string, DayEntries>
    expenses: Expense[]
    milestones: Milestone[]
    goals: Goal[]
    checkins: DayCheckin[]
  },
): Map<string, DaySummary> {
  const map = new Map(days.map((d) => [d, empty()]))
  const at = (day: string | null | undefined) => (day ? map.get(day) : undefined)

  for (const t of data.todos) {
    if (!t.done) {
      const s = at(t.due_date)
      if (s) s.todosOpen++
    } else if (t.done_at) {
      const s = at(dayOf(t.done_at))
      if (s) s.todosDone++
    }
  }
  for (const h of data.habits) {
    if (h.archived) continue
    const e = data.entries.get(h.id)
    if (!e) continue
    for (const day of days) {
      if (isDayDone(h, e, day)) map.get(day)!.habitsDone++
    }
  }
  for (const e of data.expenses) {
    const s = at(e.spent_on)
    if (s) s.spent += e.amount_cents
  }
  for (const m of data.milestones) {
    const s = m.done && m.done_at ? at(dayOf(m.done_at)) : undefined
    if (s) s.milestones++
  }
  for (const g of data.goals) {
    const s = g.status === 'active' ? at(g.target_date) : undefined
    if (s) s.goalsDue++
  }
  for (const c of data.checkins) {
    const s = at(c.day)
    if (s) {
      s.mood = c.mood
      s.energy = c.energy
      s.win = Boolean(c.win)
    }
  }
  return map
}

/** Phrase lue par les lecteurs d'écran pour une case : seulement ce qui existe. */
export function describeDay(s: DaySummary, formatMoney: (cents: number) => string): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
  return [
    s.todosOpen > 0 && plural(s.todosOpen, 'todo à faire', 'todos à faire'),
    s.todosDone > 0 && plural(s.todosDone, 'todo terminée', 'todos terminées'),
    s.habitsDone > 0 && plural(s.habitsDone, 'habitude faite', 'habitudes faites'),
    s.spent > 0 && `${formatMoney(s.spent)} dépensés`,
    s.milestones > 0 && plural(s.milestones, 'jalon atteint', 'jalons atteints'),
    s.goalsDue > 0 && plural(s.goalsDue, 'objectif à échéance', 'objectifs à échéance'),
    s.mood !== null && `humeur ${s.mood} sur 5`,
    s.win && 'victoire notée',
  ]
    .filter(Boolean)
    .join(', ')
}

/** Déplacement au clavier dans la grille (flèches, Début/Fin de semaine). */
export function moveDay(day: string, key: string): string | null {
  switch (key) {
    case 'ArrowLeft':
      return addDays(day, -1)
    case 'ArrowRight':
      return addDays(day, 1)
    case 'ArrowUp':
      return addDays(day, -7)
    case 'ArrowDown':
      return addDays(day, 7)
    case 'Home':
      return startOfWeek(day)
    case 'End':
      return addDays(startOfWeek(day), 6)
    default:
      return null
  }
}
