import { Link } from 'react-router-dom'
import { formatWeekdayShort } from '@/lib/dates'
import { currentStreak, successRate30 } from './habitLogic'
import type { Habit } from './types'

type Props = {
  habit: Habit
  days: Set<string>
  week: string[]
  today: string
  onToggle: (habitId: string, day: string) => void
}

export function HabitStats({
  habit,
  days,
  today,
}: {
  habit: Habit
  days: Set<string>
  today: string
}) {
  const streak = currentStreak(days, today, habit.target_per_week)
  const rate = Math.round(successRate30(days, today, habit.target_per_week) * 100)
  return (
    <p className="text-xs text-muted">
      Série : {streak.count}{' '}
      {streak.unit === 'day'
        ? streak.count > 1
          ? 'jours'
          : 'jour'
        : streak.count > 1
          ? 'semaines'
          : 'semaine'}
      {' · '}30 j : {rate} %
    </p>
  )
}

export function frequencyLabel(target: number): string {
  return target >= 7 ? 'Tous les jours' : `${target} fois par semaine`
}

/** Ligne d'une habitude avec la grille cochable des 7 derniers jours. */
export function HabitWeekRow({ habit, days, week, today, onToggle }: Props) {
  return (
    <li className="rounded border border-border bg-bg p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <Link to={`/habitudes/${habit.id}`} className="font-semibold hover:text-accent">
          {habit.name}
        </Link>
        <span className="text-xs text-muted">{frequencyLabel(habit.target_per_week)}</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {week.map((day) => {
          const done = days.has(day)
          return (
            <button
              key={day}
              type="button"
              aria-pressed={done}
              aria-label={`${habit.name}, ${formatWeekdayShort(day)} ${day.slice(8)}`}
              onClick={() => onToggle(habit.id, day)}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded text-xs text-muted hover:bg-surface"
            >
              <span className={day === today ? 'font-semibold text-text' : ''}>
                {formatWeekdayShort(day)}
              </span>
              <span
                className={`size-6 rounded-full border ${
                  done ? 'border-accent bg-accent' : 'border-border'
                }`}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-2">
        <HabitStats habit={habit} days={days} today={today} />
      </div>
    </li>
  )
}
