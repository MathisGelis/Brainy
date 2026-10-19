import { useState, type FormEvent } from 'react'
import { Checkbox, useToast } from '@/components/ui'
import { parseTodoInput } from '@/features/todos/parseTodoInput'
import { serializeRecurrence } from '@/features/todos/recurrence'
import {
  FOCUS_MAX,
  focusCandidates,
  focusOf,
  weekFocusCandidates,
  weekFocusOf,
} from '@/features/todos/todoLogic'
import type { Todo } from '@/features/todos/types'
import { useWithoutShopping } from '@/features/menu/useShoppingList'
import { useQuickTodo, useTodos } from '@/features/todos/useTodos'
import { celebrate } from '@/lib/celebrate'
import { parisHour, todayISO } from '@/lib/dates'

/** Top 3 d'un jour, ou priorités d'une semaine (lundi). */
export type FocusScope = { kind: 'day'; day: string } | { kind: 'week'; monday: string }

const WORDS = {
  day: {
    add: (t: string) => `Ajouter « ${t} » au Top 3`,
    remove: (t: string) => `Retirer « ${t} » du Top 3`,
    group: 'Suggestions pour le Top 3',
    done: 'Top 3 bouclé. Bravo !',
    one: 'Priorité terminée',
  },
  week: {
    add: (t: string) => `Ajouter « ${t} » aux priorités de la semaine`,
    remove: (t: string) => `Retirer « ${t} » des priorités de la semaine`,
    group: 'Suggestions pour la semaine',
    done: 'Semaine bouclée. Bravo !',
    one: 'Priorité de la semaine terminée',
  },
}

type PickerProps = {
  scope: FocusScope
  onError: (m: string) => void
  title: string
  /** Invitation affichée quand la liste est vide */
  prompt: string
}

/** 3 priorités choisies parmi les suggestions ou tapées directement. */
export function FocusPicker({ scope, onError, title, prompt }: PickerProps) {
  const toast = useToast()
  const { todos, isLoading, completeTodo, setDone, setFocus, setWeekFocus } = useTodos({
    onError,
  })
  const addQuick = useQuickTodo({ onError })
  const withoutShopping = useWithoutShopping()
  const [text, setText] = useState('')
  const words = WORDS[scope.kind]
  const key = scope.kind === 'day' ? scope.day : scope.monday

  const focus = scope.kind === 'day' ? focusOf(todos, key) : weekFocusOf(todos, key)
  const candidates = (
    scope.kind === 'day'
      ? focusCandidates(withoutShopping(todos), key)
      : weekFocusCandidates(withoutShopping(todos), key)
  ).slice(0, 5)
  const room = FOCUS_MAX - focus.length
  const done = focus.filter((t) => t.done).length
  const pick = (id: string, value: string | null) =>
    scope.kind === 'day' ? setFocus(id, value) : setWeekFocus(id, value)

  function toggle(todo: Todo) {
    if (todo.done) {
      setDone(todo.id, false)
      return
    }
    const undo = completeTodo(todo)
    const finished = done + 1 === focus.length && focus.length === FOCUS_MAX
    celebrate(finished ? 1.6 : 0.8)
    toast.show(finished ? words.done : words.one, undo)
  }

  function add(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || room <= 0) return
    const parsed = parseTodoInput(text, scope.kind === 'day' ? key : todayISO())
    addQuick({
      title: parsed.title,
      // une priorité du jour est pour ce jour ; celle de la semaine se place ensuite sur un jour
      due_date: parsed.due_date ?? (scope.kind === 'day' ? key : null),
      priority: parsed.priority,
      recurrence: serializeRecurrence(parsed.recurrence),
      listName: parsed.listName,
      ...(scope.kind === 'day' ? { focus_on: key } : { focus_week: key }),
    })
    setText('')
  }

  return (
    <section aria-labelledby={`focus-${key}`} className="card mb-4 flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 id={`focus-${key}`} className="font-semibold">
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
          {focus.length === 0 && <p className="text-muted">{prompt}</p>}
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
                    onClick={() => pick(todo.id, null)}
                    aria-label={words.remove(todo.title)}
                    className="min-h-11 min-w-11 rounded-full text-muted transition-colors hover:text-danger md:min-h-9 md:min-w-9"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}
          {focus.length === FOCUS_MAX && done === FOCUS_MAX && (
            <p className="font-semibold text-accent">{words.done}</p>
          )}

          {room > 0 && (
            <>
              {candidates.length > 0 && (
                <div role="group" aria-label={words.group} className="flex flex-wrap gap-1.5">
                  {candidates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pick(t.id, key)}
                      aria-label={words.add(t.title)}
                      className="pill min-h-9 max-w-full truncate border border-[var(--field-border)] px-3 text-xs"
                    >
                      + {t.title}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={add} className="flex gap-2">
                <input
                  enterKeyHint="send"
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

type Props = {
  /** Jour du Top 3 (aujourd'hui, ou demain dans le rituel du soir) */
  day: string
  onError: (m: string) => void
  title?: string
  prompt?: string
}

/** Les 3 priorités d'un jour. */
export function TopThree({ day, onError, title = 'Top 3 du jour', prompt }: Props) {
  const greeting =
    prompt ??
    (parisHour() < 12
      ? 'Bonjour ! Quelles sont vos 3 priorités aujourd’hui ?'
      : 'Quelles sont vos 3 priorités ?')
  return (
    <FocusPicker scope={{ kind: 'day', day }} onError={onError} title={title} prompt={greeting} />
  )
}
