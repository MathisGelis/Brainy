import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { formatWeekdayShort } from '@/lib/dates'
import { currentStreak, dayRatio, frequencyLabel, isScheduled, successRate30 } from './habitLogic'
import type { DayEntries, Habit } from './types'

type Props = {
  habit: Habit
  entries: DayEntries
  offDays: ReadonlySet<string>
  week: string[]
  today: string
  onToggle: (habit: Habit, day: string) => void
}

export function HabitStats({
  habit,
  entries,
  offDays,
  today,
}: {
  habit: Habit
  entries: DayEntries
  offDays: ReadonlySet<string>
  today: string
}) {
  const streak = currentStreak(habit, entries, today, offDays)
  const rate = Math.round(successRate30(habit, entries, today, offDays) * 100)
  const unit =
    streak.unit === 'day'
      ? streak.count > 1
        ? 'jours'
        : 'jour'
      : streak.count > 1
        ? 'semaines'
        : 'semaine'
  return (
    <p className="text-xs text-muted">
      Série : {streak.count} {unit} · 30 j : {rate} %
    </p>
  )
}

export function goalLabel(habit: Habit): string | null {
  return habit.goal_amount ? `${habit.goal_amount} ${habit.unit ?? ''}`.trim() : null
}

/** Ligne d'une habitude avec la grille cochable des 7 derniers jours. */
export function HabitWeekRow({ habit, entries, offDays, week, today, onToggle }: Props) {
  const goal = goalLabel(habit)
  return (
    <li className="card p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <Link to={`/habitudes/${habit.id}`} className="font-semibold hover:text-accent">
          {habit.name}
        </Link>
        <span className="text-right text-xs text-muted">
          {frequencyLabel(habit)}
          {goal && ` · ${goal}`}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {week.map((day) => {
          const ratio = dayRatio(habit, entries, day)
          const off = offDays.has(day)
          const planned = isScheduled(habit, day)
          const amount = entries.get(day)
          const status = off ? ', jour off' : !planned ? ', non prévu' : ''
          return (
            <button
              key={day}
              type="button"
              aria-pressed={ratio >= 1}
              aria-label={`${habit.name}, ${formatWeekdayShort(day)} ${day.slice(8)}${status}${
                habit.goal_amount && amount ? `, ${amount} sur ${habit.goal_amount}` : ''
              }`}
              onClick={() => onToggle(habit, day)}
              className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl text-xs text-muted transition-colors hover:bg-surface ${
                planned || off ? '' : 'opacity-45'
              }`}
            >
              <span className={day === today ? 'font-semibold text-text' : ''}>
                {formatWeekdayShort(day)}
              </span>
              <span
                className="habit-dot"
                data-off={off || undefined}
                data-partial={ratio > 0 && ratio < 1 ? true : undefined}
                style={{ '--ratio': ratio } as CSSProperties}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-2">
        <HabitStats habit={habit} entries={entries} offDays={offDays} today={today} />
      </div>
    </li>
  )
}
