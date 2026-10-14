import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BudgetIcon, GoalsIcon, HabitsIcon, TodoIcon, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { useBudget } from '@/features/budget/useBudget'
import { useExpensesBetween } from '@/features/budget/useBudgetExtras'
import { useGoals } from '@/features/goals/useGoals'
import { useDaysOff, useHabits } from '@/features/habits/useHabits'
import { useTodos } from '@/features/todos/useTodos'
import { addDays, formatDayMonth, monthOf, startOfWeek, todayISO } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { defaultReviewWeek, summarizeWeek, type HabitWeek } from './reviewLogic'

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="card flex flex-col gap-2 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <span className="text-accent">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function HabitDots({ habit }: { habit: HabitWeek }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {habit.days.map((d) => (
        <span
          key={d.day}
          className={`size-2.5 rounded-full ${
            d.done
              ? 'bg-accent'
              : d.off
                ? 'border border-dashed border-[var(--check-border)]'
                : d.scheduled && !d.future
                  ? 'bg-surface'
                  : 'bg-surface opacity-40'
          }`}
        />
      ))}
    </span>
  )
}

/** Revue de la semaine (lundi → dimanche) : todos, habitudes, dépenses, jalons. */
export default function ReviewPage() {
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const today = todayISO()
  const [monday, setMonday] = useState(() => defaultReviewWeek(today))
  const sunday = addDays(monday, 6)
  const currentMonday = startOfWeek(today)

  const { todos } = useTodos({ onError })
  const { habits, entries } = useHabits({ onError })
  const { offDays } = useDaysOff({ onError })
  const { goals, milestones } = useGoals({ onError })
  const { categories } = useBudget(monthOf(monday), { onError })
  const { expenses, isLoading } = useExpensesBetween(monday, sunday)

  const review = summarizeWeek({
    monday,
    today,
    todos,
    habits,
    entries,
    offDays,
    expenses,
    categories,
    milestones,
    goals,
  })
  const nav =
    'flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-30 md:min-h-10 md:min-w-10'

  const summary = [
    `${review.todosDone.length} todo${review.todosDone.length > 1 ? 's' : ''} terminée${review.todosDone.length > 1 ? 's' : ''}`,
    review.habitRate !== null ? `${Math.round(review.habitRate * 100)} % des habitudes` : null,
    `${formatCents(review.spent)} dépensés`,
  ].filter(Boolean)

  return (
    <>
      <PageHeader title="Revue de la semaine" />
      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Semaine précédente"
          className={nav}
          onClick={() => setMonday(addDays(monday, -7))}
        >
          ←
        </button>
        <p className="text-muted" aria-live="polite">
          Du {formatDayMonth(monday)} au {formatDayMonth(sunday)}
        </p>
        <button
          type="button"
          aria-label="Semaine suivante"
          className={nav}
          disabled={monday >= currentMonday}
          onClick={() => setMonday(addDays(monday, 7))}
        >
          →
        </button>
      </div>
      <p className="mb-5 text-lg">{summary.join(' · ')}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Todos" icon={<TodoIcon width={18} height={18} />}>
          {review.todosDone.length === 0 ? (
            <p className="text-muted">Aucune todo terminée cette semaine.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {review.todosDone.slice(0, 8).map((t) => (
                <li key={t.id} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                </li>
              ))}
              {review.todosDone.length > 8 && (
                <li className="text-xs text-muted">et {review.todosDone.length - 8} autres</li>
              )}
            </ul>
          )}
          {review.overdue > 0 && (
            <Link to="/todo" className="text-xs text-danger">
              {review.overdue} en retard à reprendre →
            </Link>
          )}
        </Card>

        <Card title="Habitudes" icon={<HabitsIcon width={18} height={18} />}>
          {review.habits.length === 0 ? (
            <p className="text-muted">Aucune habitude suivie.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {review.habits.map((h) => (
                <li key={h.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate">{h.name}</span>
                  <HabitDots habit={h} />
                  <span
                    className={`w-10 text-right text-xs ${h.expected > 0 && h.done >= h.expected ? 'font-semibold text-accent' : 'text-muted'}`}
                  >
                    {h.done}/{h.expected}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Dépenses" icon={<BudgetIcon width={18} height={18} />}>
          {isLoading ? (
            <div aria-hidden className="h-12 animate-pulse rounded-2xl bg-surface" />
          ) : (
            <>
              <p>
                <span className="text-[28px] leading-none font-semibold tracking-tight">
                  {formatCents(review.spent)}
                </span>{' '}
                <span className="text-muted">cette semaine</span>
              </p>
              {review.topCategories.length > 0 && (
                <ul className="flex flex-col gap-1 text-sm">
                  {review.topCategories.map((c) => (
                    <li key={c.name} className="flex justify-between gap-2">
                      <span>{c.name}</span>
                      <span className="text-muted">{formatCents(c.cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>

        <Card title="Objectifs" icon={<GoalsIcon width={18} height={18} />}>
          {review.milestonesDone.length === 0 ? (
            <p className="text-muted">Aucun jalon atteint cette semaine.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {review.milestonesDone.map((m) => (
                <li key={m.id}>
                  <span className="text-accent">◎</span> {m.title}
                  <span className="text-xs text-muted"> · {m.goal}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
