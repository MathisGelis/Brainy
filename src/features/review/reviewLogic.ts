import type { Category, Expense } from '@/features/budget/types'
import type { Goal, Milestone } from '@/features/goals/types'
import { isDayDone, isScheduled } from '@/features/habits/habitLogic'
import type { DayEntries, Habit } from '@/features/habits/types'
import type { Todo } from '@/features/todos/types'
import { addDays, startOfWeek, todayISO } from '@/lib/dates'
import { isoWeekday } from '@/lib/naturalDate'

/** Semaine revue par défaut : la semaine en cours à partir du vendredi, sinon la précédente. */
export function defaultReviewWeek(today: string): string {
  const monday = startOfWeek(today)
  return isoWeekday(today) >= 5 ? monday : addDays(monday, -7)
}

/** Jour (Europe/Paris) d'un horodatage ISO. */
const dayOf = (timestamp: string) => todayISO(new Date(timestamp))

export type HabitWeek = {
  id: string
  name: string
  done: number
  expected: number
  days: { day: string; done: boolean; off: boolean; scheduled: boolean; future: boolean }[]
}

export type WeekReview = {
  from: string
  to: string
  todosDone: { id: string; title: string }[]
  overdue: number
  habits: HabitWeek[]
  /** Part globale des objectifs d'habitudes atteints (0..1), null sans habitude */
  habitRate: number | null
  spent: number
  topCategories: { name: string; cents: number }[]
  milestonesDone: { id: string; title: string; goal: string }[]
}

type Input = {
  monday: string
  today: string
  todos: Todo[]
  habits: Habit[]
  entries: Map<string, DayEntries>
  offDays: ReadonlySet<string>
  expenses: Expense[]
  categories: Category[]
  milestones: Milestone[]
  goals: Goal[]
}

export function summarizeWeek(input: Input): WeekReview {
  const { monday, today, offDays } = input
  const from = monday
  const to = addDays(monday, 6)
  const inWeek = (day: string) => day >= from && day <= to
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  const todosDone = input.todos
    .filter((t) => t.done && t.done_at && inWeek(dayOf(t.done_at)))
    .map((t) => ({ id: t.id, title: t.title }))
  const endOfReview = to < today ? addDays(to, 1) : today
  const overdue = input.todos.filter(
    (t) => !t.done && t.due_date !== null && t.due_date < endOfReview,
  ).length

  const habits = input.habits
    .filter((h) => !h.archived)
    .map((h): HabitWeek => {
      const e = input.entries.get(h.id) ?? new Map()
      const days = week.map((day) => ({
        day,
        done: isDayDone(h, e, day),
        off: offDays.has(day),
        scheduled: isScheduled(h, day),
        future: day > today,
      }))
      const done = days.filter((d) => d.done).length
      let expected: number
      if (!h.days && h.target_per_week < 7) {
        const active = days.filter((d) => !d.off).length
        expected = Math.ceil((h.target_per_week * active) / 7)
      } else {
        expected = days.filter((d) => d.scheduled && !d.off && !d.future).length
      }
      return {
        id: h.id,
        name: h.name,
        done,
        expected,
        days,
      }
    })
  const withTarget = habits.filter((h) => h.expected > 0)
  const habitRate =
    withTarget.length === 0
      ? null
      : withTarget.reduce((sum, h) => sum + Math.min(1, h.done / h.expected), 0) / withTarget.length

  const weekExpenses = input.expenses.filter((e) => inWeek(e.spent_on))
  const spent = weekExpenses.reduce((sum, e) => sum + e.amount_cents, 0)
  const byCategory = new Map<string, number>()
  for (const e of weekExpenses) {
    const name = input.categories.find((c) => c.id === e.category_id)?.name ?? 'Sans catégorie'
    byCategory.set(name, (byCategory.get(name) ?? 0) + e.amount_cents)
  }
  const topCategories = [...byCategory.entries()]
    .map(([name, cents]) => ({ name, cents }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 3)

  const milestonesDone = input.milestones
    .filter((m) => m.done && m.done_at && inWeek(dayOf(m.done_at)))
    .map((m) => ({
      id: m.id,
      title: m.title,
      goal: input.goals.find((g) => g.id === m.goal_id)?.title ?? '',
    }))

  return { from, to, todosDone, overdue, habits, habitRate, spent, topCategories, milestonesDone }
}
