import { Link } from 'react-router-dom'
import { Checkbox } from '@/components/ui'
import { currentStreak, isDayDone, isScheduled } from '@/features/habits/habitLogic'
import { useDaysOff, useHabits } from '@/features/habits/useHabits'
import { celebrate } from '@/lib/celebrate'

export const skeleton = <div aria-hidden className="h-16 animate-pulse rounded-2xl bg-surface" />
export const rowClass = 'flex items-center gap-1 border-b border-border last:border-b-0'

export function RetryLine({ label, onRetry }: { label: string; onRetry: () => unknown }) {
  return (
    <p role="alert" className="text-danger">
      Impossible de charger {label}.{' '}
      <button
        type="button"
        onClick={() => void onRetry()}
        className="min-h-11 font-semibold underline"
      >
        Réessayer
      </button>
    </p>
  )
}

/** Ouvre (ou crée) la note du jour, taguée « journal ». */
/** Habitudes du jour : case à cocher, ou compteur pour une habitude chiffrée. */
export function TodayHabits({ today, onError }: { today: string; onError: (m: string) => void }) {
  const { habits, entries, isLoading, isError, refetch, toggleDay, setAmount } = useHabits({
    onError,
  })
  const { offDays } = useDaysOff({ onError })
  const active = habits.filter((h) => !h.archived)
  const off = offDays.has(today)

  if (isError) return <RetryLine label="les habitudes" onRetry={refetch} />
  if (isLoading) return skeleton
  if (active.length === 0) {
    return (
      <p className="text-muted">
        Aucune habitude suivie.{' '}
        <Link to="/habitudes" className="text-accent">
          En créer une
        </Link>
      </p>
    )
  }
  return (
    <>
      {off && (
        <p className="text-xs text-muted">Jour off : vos séries sont en pause aujourd'hui.</p>
      )}
      <ul>
        {active.map((habit) => {
          const habitEntries = entries.get(habit.id) ?? new Map<string, number | null>()
          const streak = currentStreak(habit, habitEntries, today, offDays)
          const done = isDayDone(habit, habitEntries, today)
          const planned = isScheduled(habit, today)
          const amount = habitEntries.has(today)
            ? (habitEntries.get(today) ?? habit.goal_amount ?? 0)
            : 0
          const unit = habit.unit ?? ''
          return (
            <li key={habit.id} className={`${rowClass} ${planned || done ? '' : 'opacity-60'}`}>
              {habit.goal_amount ? (
                <span
                  className="flex min-h-11 shrink-0 items-center"
                  role="group"
                  aria-label={`${habit.name} : quantité`}
                >
                  <button
                    type="button"
                    aria-label={`Retirer 1 ${unit} à « ${habit.name} »`}
                    disabled={amount <= 0}
                    onClick={() => setAmount(habit, today, amount - 1)}
                    className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface disabled:opacity-40 md:size-9"
                  >
                    −
                  </button>
                  <span
                    aria-live="polite"
                    className={`min-w-14 text-center text-xs tabular-nums ${done ? 'font-semibold text-accent' : 'text-muted'}`}
                  >
                    {amount}/{habit.goal_amount}
                  </span>
                  <button
                    type="button"
                    aria-label={`Ajouter 1 ${unit} à « ${habit.name} »`}
                    onClick={() => {
                      if (amount + 1 === habit.goal_amount) celebrate()
                      setAmount(habit, today, amount + 1)
                    }}
                    className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface md:size-9"
                  >
                    +
                  </button>
                </span>
              ) : (
                <Checkbox
                  hideLabel
                  label={`${habit.name} fait aujourd'hui`}
                  checked={done}
                  onChange={() => {
                    if (!done) celebrate()
                    toggleDay(habit, today)
                  }}
                />
              )}
              <span className="min-w-0 flex-1">{habit.name}</span>
              {streak.count > 0 && (
                <span className="text-xs text-muted">
                  {streak.count} {streak.unit === 'day' ? 'j' : 'sem.'}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
