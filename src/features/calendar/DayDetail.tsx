import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Checkbox, useToast } from '@/components/ui'
import type { Category, Expense } from '@/features/budget/types'
import { DayWin } from '@/features/checkins/DayWin'
import { MoodEnergy } from '@/features/checkins/MoodEnergy'
import { DayEvents } from '@/features/events/DayEvents'
import type { Goal, Milestone } from '@/features/goals/types'
import { TodayHabits } from '@/features/today/parts'
import { parseTodoInput } from '@/features/todos/parseTodoInput'
import { serializeRecurrence } from '@/features/todos/recurrence'
import type { Todo } from '@/features/todos/types'
import { useQuickTodo, useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { addDays, formatDayMonth, formatLongDay, todayISO } from '@/lib/dates'
import { formatCents } from '@/lib/money'

const h3 = 'mb-1 text-xs font-semibold text-muted uppercase'
const rowClass = 'flex min-h-11 items-center gap-2 border-b border-border last:border-b-0'

/** Jour (Europe/Paris) d'un horodatage ISO. */
const dayOf = (timestamp: string) => todayISO(new Date(timestamp))

function DayTodos({ day, onError }: { day: string; onError: (m: string) => void }) {
  const toast = useToast()
  const { todos, completeTodo, setDone } = useTodos({ onError })
  const addQuick = useQuickTodo({ onError })
  const [text, setText] = useState('')
  const label = formatLongDay(day)

  const items = todos.filter(
    (t) => t.due_date === day || (t.done && t.done_at !== null && dayOf(t.done_at) === day),
  )
  // Ouvertes d'abord, puis terminées
  items.sort((a, b) => Number(a.done) - Number(b.done) || a.position - b.position)

  function toggle(todo: Todo) {
    if (todo.done) {
      setDone(todo.id, false)
      return
    }
    celebrate()
    toast.show('Todo terminée', completeTodo(todo))
  }

  function add(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const parsed = parseTodoInput(text, todayISO())
    addQuick({
      title: parsed.title,
      due_date: parsed.due_date ?? day,
      priority: parsed.priority,
      recurrence: serializeRecurrence(parsed.recurrence),
      listName: parsed.listName,
    })
    setText('')
  }

  return (
    <section aria-label={`Todos du ${label}`}>
      <h3 className={h3}>Todos</h3>
      {items.length > 0 && (
        <ul className="mb-2">
          {items.map((todo) => (
            <li key={todo.id} className={rowClass}>
              <Checkbox
                hideLabel
                label={`Terminer « ${todo.title} »`}
                checked={todo.done}
                onChange={() => toggle(todo)}
              />
              <span
                className={`min-w-0 flex-1 ${todo.done ? 'text-muted line-through' : todo.priority === 'high' ? 'font-semibold' : ''}`}
              >
                {todo.title}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add}>
        <input
          enterKeyHint="send"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={`Nouvelle todo pour le ${label}`}
          placeholder={
            items.length === 0 ? 'Rien de prévu. Ajouter une todo…' : 'Ajouter une todo…'
          }
          className="field min-h-11 w-full px-4 md:min-h-10"
        />
      </form>
    </section>
  )
}

type Props = {
  day: string
  onError: (m: string) => void
  expenses: Expense[]
  categories: Category[]
  milestones: Milestone[]
  goals: Goal[]
}

/** Détail d'un jour : tout y est actionnable (humeur, todos, habitudes). */
export function DayDetail({ day, onError, expenses, categories, milestones, goals }: Props) {
  const today = todayISO()
  const past = day <= today
  const label = formatLongDay(day)
  const relative =
    day === today
      ? "Aujourd'hui"
      : day === addDays(today, 1)
        ? 'Demain'
        : day === addDays(today, -1)
          ? 'Hier'
          : null

  const dayExpenses = expenses.filter((e) => e.spent_on === day)
  const spent = dayExpenses.reduce((sum, e) => sum + e.amount_cents, 0)
  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? 'Sans catégorie'
  const reached = milestones.filter((m) => m.done && m.done_at && dayOf(m.done_at) === day)
  const due = goals.filter((g) => g.status === 'active' && g.target_date === day)
  const goalTitle = (id: string) => goals.find((g) => g.id === id)?.title ?? ''

  return (
    <section aria-labelledby="day-detail" className="card flex flex-col gap-5 p-5">
      <h2 id="day-detail" className="font-semibold first-letter:uppercase">
        {label}
        {relative && <span className="font-normal text-muted"> · {relative}</span>}
      </h2>

      <DayEvents day={day} onError={onError} />

      {past && (
        <section aria-label={`Humeur et énergie du ${label}`}>
          <h3 className={h3}>Humeur et énergie</h3>
          <div className="flex flex-col gap-3">
            <MoodEnergy day={day} onError={onError} />
            <DayWin
              day={day}
              onError={onError}
              label={day === today ? 'Une victoire aujourd’hui ?' : 'Victoire du jour'}
            />
          </div>
        </section>
      )}

      <DayTodos day={day} onError={onError} />

      <section aria-label={`Habitudes du ${label}`}>
        <h3 className={h3}>Habitudes</h3>
        {past ? (
          <TodayHabits
            today={day}
            onError={onError}
            dayLabel={day === today ? undefined : `le ${formatDayMonth(day)}`}
          />
        ) : (
          <p className="text-sm text-muted">Les habitudes se cochent le jour venu.</p>
        )}
      </section>

      {dayExpenses.length > 0 && (
        <section aria-label={`Dépenses du ${label}`}>
          <h3 className={`${h3} flex justify-between`}>
            <span>Dépenses</span>
            <span className="normal-case">{formatCents(spent)}</span>
          </h3>
          <ul>
            {dayExpenses.map((e) => (
              <li key={e.id} className={`${rowClass} text-sm`}>
                <span className="min-w-0 flex-1 truncate">
                  {e.recurring_id && <span className="text-muted">↻ </span>}
                  {e.note || categoryName(e.category_id)}
                  {e.note && (
                    <span className="text-xs text-muted"> · {categoryName(e.category_id)}</span>
                  )}
                </span>
                <span className="font-semibold">{formatCents(e.amount_cents)}</span>
              </li>
            ))}
          </ul>
          <Link to="/budget" className="mt-1 inline-flex min-h-11 items-center text-xs text-accent">
            Modifier dans Budget →
          </Link>
        </section>
      )}

      {(reached.length > 0 || due.length > 0) && (
        <section aria-label={`Objectifs du ${label}`}>
          <h3 className={h3}>Objectifs</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {reached.map((m) => (
              <li key={m.id}>
                <span className="text-accent">◎</span> Jalon « {m.title} » atteint
                <span className="text-xs text-muted"> · {goalTitle(m.goal_id)}</span>
              </li>
            ))}
            {due.map((g) => (
              <li key={g.id}>
                <span className="text-accent">◎</span> Échéance de « {g.title} »
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}
