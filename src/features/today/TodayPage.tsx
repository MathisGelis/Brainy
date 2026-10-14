import { Link } from 'react-router-dom'
import { BudgetIcon, Checkbox, HabitsIcon, ProgressBar, TodoIcon, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { useBudget } from '@/features/budget/useBudget'
import { currentStreak } from '@/features/habits/habitLogic'
import { useHabits } from '@/features/habits/useHabits'
import { filterTodos } from '@/features/todos/todoLogic'
import type { Todo } from '@/features/todos/types'
import { useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { formatDayMonth, monthOf, todayISO } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { DataMenu } from './DataMenu'

/** Widget de l'accueil : une carte par domaine. */
function Section({
  title,
  to,
  icon: Icon,
  className = '',
  children,
}: {
  title: string
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  className?: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={`section-${to}`}
      className={`card flex flex-col gap-2 p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 id={`section-${to}`} className="flex items-center gap-2 font-semibold">
          <span className="text-accent">
            <Icon width={18} height={18} />
          </span>
          {title}
        </h2>
        <Link
          to={to}
          className="flex min-h-11 items-center rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-8"
        >
          Tout voir
        </Link>
      </div>
      {children}
    </section>
  )
}

const skeleton = <div aria-hidden className="h-16 animate-pulse rounded-2xl bg-surface" />
const rowClass = 'flex items-center gap-1 border-b border-border last:border-b-0'

function TodayTodos({ today, onError }: { today: string; onError: (m: string) => void }) {
  const toast = useToast()
  const { todos, isLoading, isError, refetch, setDone } = useTodos({ onError })
  const dueToday = filterTodos(todos, 'today', today)

  function onToggle(todo: Todo) {
    setDone(todo.id, true)
    celebrate()
    toast.show('Todo terminée', () => setDone(todo.id, false))
  }

  if (isError) return <RetryLine label="les todos" onRetry={refetch} />
  if (isLoading) return skeleton
  if (dueToday.length === 0) {
    return <p className="text-muted">Rien d'urgent aujourd'hui.</p>
  }
  return (
    <ul>
      {dueToday.map((todo) => (
        <li key={todo.id} className={rowClass}>
          <Checkbox
            hideLabel
            label={`Terminer « ${todo.title} »`}
            checked={todo.done}
            onChange={() => onToggle(todo)}
          />
          <span className={`min-w-0 flex-1 ${todo.priority === 'high' ? 'font-semibold' : ''}`}>
            {todo.title}
          </span>
          {todo.due_date !== null && todo.due_date < today && (
            <span className="text-xs text-danger">{formatDayMonth(todo.due_date)}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function TodayHabits({ today, onError }: { today: string; onError: (m: string) => void }) {
  const { habits, logDays, isLoading, isError, refetch, toggleDay } = useHabits({ onError })
  const active = habits.filter((h) => !h.archived)

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
    <ul>
      {active.map((habit) => {
        const days = logDays.get(habit.id) ?? new Set<string>()
        const streak = currentStreak(days, today, habit.target_per_week)
        return (
          <li key={habit.id} className={rowClass}>
            <Checkbox
              hideLabel
              label={`${habit.name} fait aujourd'hui`}
              checked={days.has(today)}
              onChange={() => {
                if (!days.has(today)) celebrate()
                toggleDay(habit.id, today)
              }}
            />
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
  )
}

function MonthBudget({ today, onError }: { today: string; onError: (m: string) => void }) {
  const { summary, isLoading, isError, refetch } = useBudget(monthOf(today), { onError })
  if (isError) return <RetryLine label="le budget" onRetry={refetch} />
  if (isLoading) return skeleton
  const { totalSpent, totalBudget, remaining, over } = summary
  return (
    <div className="flex flex-col gap-2">
      <p>
        <span className="text-[34px] leading-none font-semibold tracking-tight">
          {formatCents(totalSpent)}
        </span>{' '}
        <span className="text-muted">
          {totalBudget > 0 ? `/ ${formatCents(totalBudget)}` : 'dépensés ce mois-ci'}
        </span>
      </p>
      {remaining !== null && (
        <>
          <ProgressBar
            ratio={Math.min(1, totalSpent / totalBudget)}
            over={over}
            label="Budget du mois consommé"
          />
          <p className={`text-xs ${over ? 'text-danger' : 'text-muted'}`}>
            {over ? `Dépassement de ${formatCents(-remaining)}` : `Reste ${formatCents(remaining)}`}
          </p>
        </>
      )}
    </div>
  )
}

function RetryLine({ label, onRetry }: { label: string; onRetry: () => unknown }) {
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

export default function TodayPage() {
  const toast = useToast()
  const today = todayISO()
  const onError = (m: string) => toast.show(m)
  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date())

  return (
    <>
      <PageHeader title="Aujourd'hui" />
      <p className="-mt-4 mb-6 text-muted first-letter:uppercase">{dateLabel}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Todos du jour" to="/todo" icon={TodoIcon}>
          <TodayTodos today={today} onError={onError} />
        </Section>
        <Section title="Habitudes du jour" to="/habitudes" icon={HabitsIcon}>
          <TodayHabits today={today} onError={onError} />
        </Section>
        <Section title="Budget du mois" to="/budget" icon={BudgetIcon} className="md:col-span-2">
          <MonthBudget today={today} onError={onError} />
        </Section>
      </div>
      <DataMenu />
    </>
  )
}
