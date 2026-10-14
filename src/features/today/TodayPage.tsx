import { Link, useNavigate } from 'react-router-dom'
import {
  BudgetIcon,
  Checkbox,
  GoalsIcon,
  HabitsIcon,
  NotesIcon,
  ProgressBar,
  TodoIcon,
  useToast,
} from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { projectMonthEnd } from '@/features/budget/recurringLogic'
import { useBudget } from '@/features/budget/useBudget'
import { MoodEnergy } from '@/features/checkins/MoodEnergy'
import { useNotes } from '@/features/notes/useNotes'
import { goalProgress, milestonesOf, nextMilestone } from '@/features/goals/goalLogic'
import type { Goal, Milestone } from '@/features/goals/types'
import { useGoals } from '@/features/goals/useGoals'
import { useRecurring } from '@/features/budget/useBudgetExtras'
import { isPlanningTime, planningMonday } from '@/features/planning/planningLogic'
import { filterTodos, weekFocusOf } from '@/features/todos/todoLogic'
import type { Todo } from '@/features/todos/types'
import { useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { addDays, formatDayMonth, monthOf, parisHour, startOfWeek, todayISO } from '@/lib/dates'
import { eveningRitualDoneOn, weekPlannedFor } from '@/lib/ritual'
import { isoWeekday } from '@/lib/naturalDate'
import { formatCents } from '@/lib/money'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { DataMenu } from './DataMenu'
import { TopThree } from './TopThree'
import { RetryLine, rowClass, skeleton, TodayHabits } from './parts'

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

function TodayTodos({ today, onError }: { today: string; onError: (m: string) => void }) {
  const toast = useToast()
  const { todos, isLoading, isError, refetch, completeTodo, snoozeTodo } = useTodos({ onError })
  const dueToday = filterTodos(todos, 'today', today)

  function onToggle(todo: Todo) {
    const undo = completeTodo(todo)
    celebrate()
    toast.show('Todo terminée', undo)
  }

  function onSnooze(todo: Todo) {
    const previous = todo.due_date
    snoozeTodo(todo.id, addDays(today, 1))
    toast.show('Reportée à demain', () => previous && snoozeTodo(todo.id, previous))
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
          <button
            type="button"
            onClick={() => onSnooze(todo)}
            aria-label={`Reporter « ${todo.title} » à demain`}
            className="min-h-11 rounded-full px-2.5 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-8"
          >
            Demain
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Rappel des priorités de la semaine (planifiées le dimanche), cochables. */
function WeekPriorities({ today, onError }: { today: string; onError: (m: string) => void }) {
  const toast = useToast()
  const { todos, completeTodo, setDone } = useTodos({ onError })
  const items = weekFocusOf(todos, startOfWeek(today))
  if (items.length === 0) return null
  const done = items.filter((t) => t.done).length
  return (
    <section aria-labelledby="week-priorities" className="card mb-4 flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between">
        <h2 id="week-priorities" className="text-xs font-semibold text-muted uppercase">
          Priorités de la semaine
        </h2>
        <span
          className={`text-xs ${done === items.length ? 'font-semibold text-accent' : 'text-muted'}`}
        >
          {done}/{items.length}
        </span>
      </div>
      <ul>
        {items.map((todo) => (
          <li key={todo.id} className="flex items-center gap-2">
            <Checkbox
              hideLabel
              label={`Terminer « ${todo.title} »`}
              checked={todo.done}
              onChange={() => {
                if (todo.done) return setDone(todo.id, false)
                celebrate(0.8)
                toast.show('Priorité de la semaine terminée', completeTodo(todo))
              }}
            />
            <span className={`min-w-0 flex-1 ${todo.done ? 'text-muted line-through' : ''}`}>
              {todo.title}
            </span>
            {todo.due_date && !todo.done && (
              <span className="text-xs text-muted">{formatDayMonth(todo.due_date)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function TodayGoals({ onError }: { onError: (m: string) => void }) {
  const toast = useToast()
  const { goals, milestones, isLoading, isError, refetch, setMilestoneDone } = useGoals({ onError })
  const { todos } = useTodos({ onError })
  if (isError) return <RetryLine label="les objectifs" onRetry={refetch} />
  if (isLoading) return skeleton

  const items = goals
    .filter((g) => g.status === 'active')
    .map((goal) => ({ goal, next: nextMilestone(milestones, goal.id) }))
    .filter((x): x is { goal: Goal; next: Milestone } => x.next !== undefined)
    .slice(0, 5)

  if (items.length === 0) {
    return (
      <p className="text-muted">
        Aucun jalon à venir.{' '}
        <Link to="/objectifs" className="text-accent">
          Planifier un objectif
        </Link>
      </p>
    )
  }
  return (
    <ul>
      {items.map(({ goal, next }) => {
        const linked = todos
          .filter((t) => t.goal_id === goal.id)
          .map((t) => ({ id: t.id, title: t.title, done: t.done, recurrence: t.recurrence }))
        const percent = Math.round(
          goalProgress(milestonesOf(milestones, goal.id), linked).ratio * 100,
        )
        return (
          <li key={goal.id} className={rowClass}>
            <Checkbox
              hideLabel
              label={`Jalon « ${next.title} » de « ${goal.title} » fait`}
              checked={false}
              onChange={() => {
                setMilestoneDone(next.id, true)
                celebrate(0.8)
                toast.show('Jalon atteint', () => setMilestoneDone(next.id, false))
              }}
            />
            <span className="min-w-0 flex-1">
              {next.title}
              <span className="block truncate text-xs text-muted">{goal.title}</span>
            </span>
            <span className="text-xs text-muted">{percent} %</span>
          </li>
        )
      })}
    </ul>
  )
}

function MonthBudget({ today, onError }: { today: string; onError: (m: string) => void }) {
  const { summary, expenses, isLoading, isError, refetch } = useBudget(monthOf(today), { onError })
  const { rules } = useRecurring({ onError })
  if (isError) return <RetryLine label="le budget" onRetry={refetch} />
  if (isLoading) return skeleton
  const { totalSpent, totalBudget, remaining, over } = summary
  const projection = projectMonthEnd(expenses, rules, monthOf(today), today)
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
      {projection !== null && (
        <p
          className={`text-xs ${totalBudget > 0 && projection > totalBudget ? 'text-danger' : 'text-muted'}`}
        >
          À ce rythme : {formatCents(projection)} en fin de mois
        </p>
      )}
    </div>
  )
}

function DailyNoteButton({ today, onError }: { today: string; onError: (m: string) => void }) {
  const navigate = useNavigate()
  const { openDailyNote, isLoading } = useNotes({ onError })
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => navigate(`/notes/${openDailyNote(today)}`)}
      className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--field-border)] bg-bg px-4 text-sm transition-colors hover:bg-surface disabled:opacity-50 md:min-h-9"
    >
      <NotesIcon width={16} height={16} />
      Note du jour
    </button>
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
      <div className="-mt-4 mb-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted first-letter:uppercase">{dateLabel}</p>
        <DailyNoteButton today={today} onError={onError} />
      </div>
      <TopThree day={today} onError={onError} />
      <WeekPriorities today={today} onError={onError} />
      <section aria-label="Humeur et énergie du jour" className="card mb-4 p-4">
        <MoodEnergy day={today} onError={onError} title="Comment ça va ?" />
      </section>
      {parisHour() >= 18 && eveningRitualDoneOn() !== today && (
        <Link
          to="/rituel"
          className="card mb-4 flex min-h-14 items-center justify-between gap-3 p-4 transition-colors hover:bg-surface"
        >
          <span>
            <span className="font-semibold">Rituel du soir</span>
            <span className="block text-xs text-muted">
              30 secondes pour boucler la journée et préparer demain
            </span>
          </span>
          <span aria-hidden className="text-accent">
            →
          </span>
        </Link>
      )}
      {isPlanningTime(today) && weekPlannedFor() !== planningMonday(today) && (
        <Link
          to="/semaine"
          className="card mb-4 flex min-h-14 items-center justify-between gap-3 p-4 transition-colors hover:bg-surface"
        >
          <span>
            <span className="font-semibold">
              {planningMonday(today) === startOfWeek(today)
                ? 'Planifier cette semaine'
                : 'Planifier la semaine prochaine'}
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
      {isoWeekday(today) >= 7 || isoWeekday(today) === 1 ? (
        <Link
          to="/revue"
          className="card mb-4 flex min-h-14 items-center justify-between gap-3 p-4 transition-colors hover:bg-surface"
        >
          <span>
            <span className="font-semibold">
              {isoWeekday(today) === 1
                ? 'La revue de la semaine dernière est prête'
                : 'Votre revue de la semaine est prête'}
            </span>
            <span className="block text-xs text-muted">
              Todos, habitudes, dépenses et jalons en un coup d'œil
            </span>
          </span>
          <span aria-hidden className="text-accent">
            →
          </span>
        </Link>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Todos du jour" to="/todo" icon={TodoIcon}>
          <TodayTodos today={today} onError={onError} />
        </Section>
        <Section title="Habitudes du jour" to="/habitudes" icon={HabitsIcon}>
          <TodayHabits today={today} onError={onError} />
        </Section>
        <Section
          title="Prochains jalons"
          to="/objectifs"
          icon={GoalsIcon}
          className="md:col-span-2"
        >
          <TodayGoals onError={onError} />
        </Section>
        <Section title="Budget du mois" to="/budget" icon={BudgetIcon} className="md:col-span-2">
          <MonthBudget today={today} onError={onError} />
        </Section>
      </div>
      <DataMenu />
    </>
  )
}
