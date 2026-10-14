import { useState, type FormEvent } from 'react'
import { Checkbox, useToast } from '@/components/ui'
import { parseTodoInput } from '@/features/todos/parseTodoInput'
import { serializeRecurrence } from '@/features/todos/recurrence'
import { FOCUS_MAX, focusCandidates, focusOf } from '@/features/todos/todoLogic'
import type { Todo } from '@/features/todos/types'
import { useQuickTodo, useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { parisHour } from '@/lib/dates'

type Props = {
  /** Jour du Top 3 (aujourd'hui, ou demain dans le rituel du soir) */
  day: string
  onError: (m: string) => void
  title?: string
  /** Invitation affichée quand le Top 3 est vide */
  prompt?: string
}

/** Les 3 priorités d'un jour : choisies parmi les suggestions ou tapées directement. */
export function TopThree({ day, onError, title = 'Top 3 du jour', prompt }: Props) {
  const toast = useToast()
  const { todos, isLoading, completeTodo, setDone, setFocus } = useTodos({ onError })
  const addQuick = useQuickTodo({ onError })
  const [text, setText] = useState('')

  const focus = focusOf(todos, day)
  const candidates = focusCandidates(todos, day).slice(0, 5)
  const room = FOCUS_MAX - focus.length
  const done = focus.filter((t) => t.done).length

  function toggle(todo: Todo) {
    if (todo.done) {
      setDone(todo.id, false)
      return
    }
    const undo = completeTodo(todo)
    const finished = done + 1 === focus.length && focus.length === FOCUS_MAX
    celebrate(finished ? 1.6 : 0.8)
    toast.show(finished ? 'Top 3 bouclé. Bravo !' : 'Priorité terminée', undo)
  }

  function add(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || room <= 0) return
    const parsed = parseTodoInput(text, day)
    addQuick({
      title: parsed.title,
      due_date: parsed.due_date ?? day,
      priority: parsed.priority,
      recurrence: serializeRecurrence(parsed.recurrence),
      listName: parsed.listName,
      focus_on: day,
    })
    setText('')
  }

  const greeting =
    prompt ??
    (parisHour() < 12
      ? 'Bonjour ! Quelles sont vos 3 priorités aujourd’hui ?'
      : 'Quelles sont vos 3 priorités ?')

  return (
    <section aria-labelledby={`top3-${day}`} className="card mb-4 flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 id={`top3-${day}`} className="font-semibold">
          {title}
        </h2>
        {focus.length > 0 && (
          <span
            className={`text-xs ${done === focus.length ? 'font-semibold text-accent' : 'text-muted'}`}
          >
            {done}/{focus.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div aria-hidden className="h-12 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <>
          {focus.length === 0 && <p className="text-muted">{greeting}</p>}
          {focus.length > 0 && (
            <ol className="flex flex-col">
              {focus.map((todo, i) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-2 border-b border-border last:border-b-0"
                >
                  <span aria-hidden className="w-4 text-center text-xs font-semibold text-accent">
                    {i + 1}
                  </span>
                  <Checkbox
                    hideLabel
                    label={`Terminer « ${todo.title} »`}
                    checked={todo.done}
                    onChange={() => toggle(todo)}
                  />
                  <span
                    className={`min-w-0 flex-1 ${todo.done ? 'text-muted line-through' : 'font-semibold'}`}
                  >
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFocus(todo.id, null)}
                    aria-label={`Retirer « ${todo.title} » du Top 3`}
                    className="min-h-11 min-w-11 rounded-full text-muted transition-colors hover:text-danger md:min-h-9 md:min-w-9"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}
          {focus.length === FOCUS_MAX && done === FOCUS_MAX && (
            <p className="font-semibold text-accent">Top 3 bouclé. Bravo !</p>
          )}

          {room > 0 && (
            <>
              {candidates.length > 0 && (
                <div
                  role="group"
                  aria-label="Suggestions pour le Top 3"
                  className="flex flex-wrap gap-1.5"
                >
                  {candidates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFocus(t.id, day)}
                      aria-label={`Ajouter « ${t.title} » au Top 3`}
                      className="pill min-h-9 max-w-full truncate border border-[var(--field-border)] px-3 text-xs"
                    >
                      + {t.title}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={add} className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-label={`Nouvelle priorité (${title})`}
                  placeholder={`Ajouter une priorité… (${room} restante${room > 1 ? 's' : ''})`}
                  className="field min-h-11 min-w-0 flex-1 px-4 md:min-h-10"
                />
              </form>
            </>
          )}
        </>
      )}
    </section>
  )
}
