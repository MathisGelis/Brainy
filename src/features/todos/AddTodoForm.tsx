import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui'
import { formatDue, todayISO } from '@/lib/dates'
import { parseTodoInput } from './parseTodoInput'
import { describeRecurrence, serializeRecurrence } from './recurrence'
import type { NewTodoInput } from './useTodos'

type Props = {
  /** Échéance pré-remplie (ex. aujourd'hui quand le filtre « Aujourd'hui » est actif). */
  defaultDue: string | null
  onAdd: (todo: NewTodoInput & { listName: string | null }) => void
}

const chip = 'rounded-full bg-surface px-2.5 py-1 text-xs text-text'

/**
 * Champ toujours visible, en langage naturel : « Payer le loyer demain ! #maison tous les mois ».
 * Ce qui est compris s'affiche en direct ; Entrée valide et le focus reste pour enchaîner.
 */
export function AddTodoForm({ defaultDue, onAdd }: Props) {
  const [text, setText] = useState('')
  const [due, setDue] = useState<string | null>(null)
  const [high, setHigh] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const today = todayISO()
  const parsed = text.trim() ? parseTodoInput(text, today) : null
  const understood = parsed && parsed.title !== text.trim()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!parsed) return
    onAdd({
      title: parsed.title,
      due_date: parsed.due_date ?? due ?? defaultDue,
      priority: parsed.priority === 'high' || high ? 'high' : 'normal',
      recurrence: serializeRecurrence(parsed.recurrence),
      listName: parsed.listName,
    })
    setText('')
    setDue(null)
    setHigh(false)
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={submit} className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          enterKeyHint="send"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Nouvelle todo"
          aria-describedby="todo-hint"
          placeholder="Ajouter une todo… (« demain », « ! », « #liste »)"
          autoFocus
          className="field min-h-11 min-w-0 flex-1 basis-60 px-4 md:min-h-10"
        />
        <input
          type="date"
          value={due ?? defaultDue ?? ''}
          onChange={(e) => setDue(e.target.value || null)}
          aria-label="Échéance"
          className="field min-h-11 px-3 text-muted md:min-h-10"
        />
        <button
          type="button"
          aria-pressed={high}
          aria-label="Priorité haute"
          onClick={() => setHigh((v) => !v)}
          className="pill min-h-11 min-w-11 border border-[var(--field-border)] font-semibold md:min-h-10 md:min-w-10"
        >
          !
        </button>
        <Button type="submit">Ajouter</Button>
      </div>
      <p
        id="todo-hint"
        aria-live="polite"
        className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5"
      >
        {understood && (
          <>
            <span className="sr-only">Compris :</span>
            <span className={`${chip} font-semibold`}>{parsed.title}</span>
            {parsed.due_date && <span className={chip}>{formatDue(parsed.due_date, today)}</span>}
            {parsed.priority === 'high' && <span className={`${chip} text-accent`}>! Haute</span>}
            {parsed.listName && <span className={chip}>#{parsed.listName}</span>}
            {parsed.recurrence && (
              <span className={chip}>↻ {describeRecurrence(parsed.recurrence)}</span>
            )}
          </>
        )}
      </p>
    </form>
  )
}
