import { Link, useNavigate } from 'react-router-dom'
import { Checkbox, HabitsIcon, NotesIcon, TodoIcon, useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { MoodEnergy } from '@/features/checkins/MoodEnergy'
import { TodayEvents } from '@/features/events/TodayEvents'
import { useNotes } from '@/features/notes/useNotes'
import { isPlanningTime, planningMonday } from '@/features/planning/planningLogic'
import { filterTodos, weekFocusOf } from '@/features/todos/todoLogic'
import type { Todo } from '@/features/todos/types'
import { useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { addDays, formatDayMonth, parisHour, startOfWeek, todayISO } from '@/lib/dates'
import { eveningRitualDoneOn, weekPlannedFor } from '@/lib/ritual'
import { isoWeekday } from '@/lib/naturalDate'
import { DataMenu } from './DataMenu'
import { TopThree } from './TopThree'
import { RetryLine, rowClass, Section, skeleton, TodayHabits } from './parts'

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
            className="min-h-11 shrink-0 rounded-full px-2.5 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-8"
          >
            {/* une action, pas une échéance : ces todos sont pour aujourd'hui */}
            Reporter à demain
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
      <TodayEvents today={today} onError={onError} />
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
      </div>
      <DataMenu />
    </>
  )
}
