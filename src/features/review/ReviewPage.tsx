import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BudgetIcon, GoalsIcon, HabitsIcon, TodayIcon, TodoIcon, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { useBudget } from '@/features/budget/useBudget'
import {
  average,
  FIELD_NAMES,
  formatDiff,
  formatScore,
  habitLinks,
  LABELS,
} from '@/features/checkins/checkinLogic'
import { EnergyBars, MoodFace } from '@/features/checkins/MoodEnergy'
import type { DayCheckin } from '@/features/checkins/types'
import { useCheckins } from '@/features/checkins/useCheckins'
import { useExpensesBetween } from '@/features/budget/useBudgetExtras'
import { useGoals } from '@/features/goals/useGoals'
import { useDaysOff, useHabits } from '@/features/habits/useHabits'
import { planningMonday } from '@/features/planning/planningLogic'
import { weekFocusOf } from '@/features/todos/todoLogic'
import { useTodos } from '@/features/todos/useTodos'
import {
  addDays,
  formatDayMonth,
  formatWeekdayShort,
  monthOf,
  startOfWeek,
  todayISO,
} from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { defaultReviewWeek, summarizeWeek, type HabitWeek } from './reviewLogic'

function Card({
  title,
  icon,
  className = '',
  children,
}: {
  title: string
  icon: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className={`card flex flex-col gap-2 p-5 ${className}`}>
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

/** Humeur et énergie de la semaine, et liens simples avec les habitudes (8 dernières semaines). */
function MoodCard({
  monday,
  checkins,
  links,
}: {
  monday: string
  checkins: DayCheckin[]
  links: ReturnType<typeof habitLinks>
}) {
  const sunday = addDays(monday, 6)
  const byDay = new Map(checkins.map((c) => [c.day, c]))
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const mood = average(checkins, 'mood', monday, sunday)
  const energy = average(checkins, 'energy', monday, sunday)

  return (
    <Card
      title="Humeur et énergie"
      icon={<TodayIcon width={18} height={18} />}
      className="md:col-span-2"
    >
      {mood === null && energy === null ? (
        <p className="text-muted">
          Aucune saisie cette semaine.{' '}
          <Link to="/" className="text-accent">
            Noter mon humeur
          </Link>
        </p>
      ) : (
        <>
          <p>
            {(['mood', 'energy'] as const)
              .map((field) => {
                const value = field === 'mood' ? mood : energy
                return value === null ? null : `${FIELD_NAMES[field]} ${formatScore(value)} / 5`
              })
              .filter(Boolean)
              .join(' · ')}
          </p>
          <ul className="grid grid-cols-7 gap-1 text-center">
            {week.map((day) => {
              const c = byDay.get(day)
              const parts = [
                c?.mood ? `humeur ${LABELS.mood[c.mood - 1]}` : null,
                c?.energy ? `énergie ${LABELS.energy[c.energy - 1]}` : null,
              ].filter(Boolean)
              return (
                <li key={day} className="flex flex-col items-center gap-0.5">
                  <span className="text-xs text-muted">{formatWeekdayShort(day)}</span>
                  <span className={c?.mood ? 'text-accent' : 'text-muted opacity-30'}>
                    <MoodFace value={c?.mood ?? 3} size={18} />
                  </span>
                  <span className={c?.energy ? 'text-accent' : 'text-muted opacity-30'}>
                    <EnergyBars value={c?.energy ?? 0} size={18} />
                  </span>
                  <span className="sr-only">
                    {formatDayMonth(day)} : {parts.length > 0 ? parts.join(', ') : 'pas de saisie'}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {links.length > 0 && (
        <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
          <ul className="flex flex-col gap-1 text-sm">
            {links.map((l) => (
              <li key={`${l.habitId}-${l.field}`}>
                Les jours de « {l.habit} », {FIELD_NAMES[l.field].toLowerCase()}{' '}
                <span className={l.diff > 0 ? 'font-semibold text-accent' : 'font-semibold'}>
                  {formatDiff(l.diff)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Sur les 8 dernières semaines : des constats, pas des causes.
          </p>
        </div>
      )}
    </Card>
  )
}

/** Victoires notées chaque soir pendant la semaine. */
function WinsCard({ wins }: { wins: DayCheckin[] }) {
  return (
    <Card
      title="Victoires"
      icon={
        <span aria-hidden className="text-[17px] leading-none">
          ★
        </span>
      }
      className="md:col-span-2"
    >
      {wins.length === 0 ? (
        <p className="text-muted">
          Aucune victoire notée cette semaine.{' '}
          <Link to="/rituel" className="text-accent">
            Le rituel du soir
          </Link>{' '}
          vous en demande une chaque jour.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {wins.map((c) => (
            <li key={c.day} className="flex gap-3">
              <span className="w-20 shrink-0 text-xs leading-6 whitespace-nowrap text-muted">
                {formatWeekdayShort(c.day)} {formatDayMonth(c.day)}
              </span>
              <span className="min-w-0 flex-1">{c.win}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
  const { checkins } = useCheckins({ onError })
  const wins = checkins.filter((c) => c.win && c.day >= monday && c.day <= sunday)
  const links = habitLinks({
    checkins,
    habits,
    entries,
    offDays,
    to: sunday < today ? sunday : today,
  })

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

  const priorities = weekFocusOf(todos, monday)
  const prioritiesDone = priorities.filter((t) => t.done).length
  const nextToPlan = planningMonday(today)

  const summary = [
    priorities.length > 0 ? `${prioritiesDone}/${priorities.length} priorités tenues` : null,
    `${review.todosDone.length} todo${review.todosDone.length > 1 ? 's' : ''} terminée${review.todosDone.length > 1 ? 's' : ''}`,
    review.habitRate !== null ? `${Math.round(review.habitRate * 100)} % des habitudes` : null,
    `${formatCents(review.spent)} dépensés`,
    wins.length > 0 ? `${wins.length} victoire${wins.length > 1 ? 's' : ''}` : null,
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
          {priorities.length > 0 && (
            <section aria-label="Priorités de la semaine" className="mb-1">
              <h3 className="mb-1 text-xs font-semibold text-muted uppercase">
                Priorités de la semaine
              </h3>
              <ul className="flex flex-col gap-1">
                {priorities.map((t) => (
                  <li key={t.id} className="flex gap-2">
                    <span className={t.done ? 'text-accent' : 'text-muted'}>
                      {t.done ? '★' : '☆'}
                    </span>
                    <span className={`min-w-0 flex-1 truncate ${t.done ? '' : 'text-muted'}`}>
                      {t.title}
                    </span>
                    <span className="sr-only">{t.done ? 'tenue' : 'pas tenue'}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
        <WinsCard wins={wins} />
        <MoodCard monday={monday} checkins={checkins} links={links} />
      </div>
      {nextToPlan > monday && (
        <Link
          to="/semaine"
          className="card mt-4 flex min-h-14 items-center justify-between gap-3 p-4 transition-colors hover:bg-surface"
        >
          <span>
            <span className="font-semibold">
              Planifier la semaine du {formatDayMonth(nextToPlan)}
            </span>
            <span className="block text-xs text-muted">
              Reprendre ce qui traîne, choisir 3 priorités, répartir sur les jours
            </span>
          </span>
          <span aria-hidden className="text-accent">
            →
          </span>
        </Link>
      )}
    </>
  )
}
