import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { StepFlow } from '@/features/today/StepFlow'
import { FocusPicker } from '@/features/today/TopThree'
import type { Todo } from '@/features/todos/types'
import { useWithoutShopping } from '@/features/menu/useShoppingList'
import { useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { addDays, formatDayMonth, formatLongDay, formatWeekdayShort, todayISO } from '@/lib/dates'
import { markWeekPlanned } from '@/lib/ritual'
import { dayLoad, overdueTodos, planningMonday, toSchedule, weekDays } from './planningLogic'

const small =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9'
const row = 'flex flex-col gap-1.5 border-b border-border py-2.5 last:border-b-0'

/** Sept pastilles L M M J V S D pour donner un jour à une todo. */
function DayPills({
  todo,
  days,
  today,
  onPick,
}: {
  todo: Todo
  days: string[]
  today: string
  onPick: (todo: Todo, day: string) => void
}) {
  return (
    <div role="group" aria-label={`Jour pour « ${todo.title} »`} className="flex flex-wrap gap-1">
      {days.map((d) => (
        <button
          key={d}
          type="button"
          disabled={d < today}
          aria-pressed={todo.due_date === d}
          aria-label={`Planifier « ${todo.title} » le ${formatLongDay(d)}`}
          onClick={() => onPick(todo, d)}
          className="pill flex size-11 items-center justify-center border border-[var(--field-border)] text-xs disabled:opacity-30 md:size-9"
        >
          {formatWeekdayShort(d)
            .slice(0, 2)
            .replace(/^./, (c) => c.toUpperCase())}
        </button>
      ))}
    </div>
  )
}

/** Étape 1 : reprendre ce qui traîne (fait, un jour de la semaine, ou sans date). */
function Overdue({
  todos,
  days,
  today,
  onError,
}: {
  todos: Todo[]
  days: string[]
  today: string
  onError: (m: string) => void
}) {
  const toast = useToast()
  const { completeTodo, snoozeTodo, updateTodo } = useTodos({ onError })
  const late = overdueTodos(todos, today)
  if (late.length === 0) return <p className="text-muted">Rien ne traîne. Bien joué.</p>
  return (
    <ul>
      {late.map((todo) => (
        <li key={todo.id} className={row}>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1">{todo.title}</span>
            <span className="text-xs text-danger">{formatDayMonth(todo.due_date!)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <DayPills
              todo={todo}
              days={days}
              today={today}
              onPick={(t, d) => snoozeTodo(t.id, d)}
            />
            <button
              type="button"
              className={small}
              onClick={() => {
                const previous = todo.due_date
                updateTodo(todo.id, { due_date: null })
                toast.show('Date retirée', () => snoozeTodo(todo.id, previous!))
              }}
            >
              Sans date
            </button>
            <button
              type="button"
              className={small}
              onClick={() => {
                celebrate(0.6)
                toast.show('Todo terminée', completeTodo(todo))
              }}
            >
              Fait
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Étape 3 : répartir les todos sans date sur les jours, en voyant la charge de chacun. */
function Schedule({
  todos,
  days,
  monday,
  today,
  onError,
}: {
  todos: Todo[]
  days: string[]
  monday: string
  today: string
  onError: (m: string) => void
}) {
  const toast = useToast()
  const { snoozeTodo, updateTodo } = useTodos({ onError })
  const [showAll, setShowAll] = useState(false)
  const load = dayLoad(todos, days)
  const pending = toSchedule(todos, monday)
  const shown = showAll ? pending : pending.slice(0, 8)

  function place(todo: Todo, day: string) {
    snoozeTodo(todo.id, day)
    toast.show(`« ${todo.title} » le ${formatLongDay(day)}`, () =>
      updateTodo(todo.id, { due_date: null }),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Charge de la semaine" className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => {
          const n = load.get(d) ?? 0
          return (
            <li
              key={d}
              className={`flex flex-col rounded-xl py-1.5 ${d < today ? 'opacity-40' : 'bg-surface/40'}`}
            >
              <span className="text-xs text-muted first-letter:uppercase">
                {formatWeekdayShort(d)}
              </span>
              <span className={`text-sm ${n > 0 ? 'font-semibold text-accent' : 'text-muted'}`}>
                {n}
              </span>
              <span className="sr-only">
                {formatLongDay(d)} : {n} todo{n > 1 ? 's' : ''}
              </span>
            </li>
          )
        })}
      </ul>
      {pending.length === 0 ? (
        <p className="text-muted">Toutes vos todos ont un jour. Rien à répartir.</p>
      ) : (
        <ul>
          {shown.map((todo) => (
            <li key={todo.id} className={row}>
              <span className={todo.focus_week === monday ? 'font-semibold' : ''}>
                {todo.focus_week === monday && (
                  <>
                    <span aria-hidden className="text-accent">
                      ★{' '}
                    </span>
                    <span className="sr-only">Priorité de la semaine : </span>
                  </>
                )}
                {todo.title}
              </span>
              <DayPills todo={todo} days={days} today={today} onPick={place} />
            </li>
          ))}
        </ul>
      )}
      {pending.length > shown.length && (
        <button type="button" onClick={() => setShowAll(true)} className={`${small} self-start`}>
          Voir les {pending.length - shown.length} autres
        </button>
      )}
    </div>
  )
}

/** Rituel du dimanche : reprendre ce qui traîne, choisir 3 priorités, répartir sur les jours. */
export default function PlanningPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const onError = (m: string) => toast.show(m)
  const today = todayISO()
  const monday = planningMonday(today)
  const days = weekDays(monday)
  const withoutShopping = useWithoutShopping()
  const todos = withoutShopping(useTodos({ onError }).todos)

  function finish() {
    markWeekPlanned(monday)
    celebrate(1.2)
    toast.show('Semaine planifiée. Bonne semaine !')
    navigate('/')
  }

  return (
    <>
      <PageHeader title="Planifier la semaine" />
      <p className="-mt-4 mb-6 text-muted">
        Du {formatDayMonth(monday)} au {formatDayMonth(addDays(monday, 6))}
      </p>
      <StepFlow
        onFinish={finish}
        steps={[
          {
            title: 'Ce qui traîne',
            body: <Overdue todos={todos} days={days} today={today} onError={onError} />,
          },
          {
            title: '3 priorités pour la semaine',
            body: (
              <FocusPicker
                scope={{ kind: 'week', monday }}
                onError={onError}
                title="Priorités de la semaine"
                prompt="Qu’est-ce qui compterait vraiment, cette semaine ?"
              />
            ),
          },
          {
            title: 'Répartir sur les jours',
            body: (
              <Schedule todos={todos} days={days} monday={monday} today={today} onError={onError} />
            ),
          },
        ]}
      />
    </>
  )
}
