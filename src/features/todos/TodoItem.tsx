import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { Checkbox, Select } from '@/components/ui'
import { addDays, formatDue } from '@/lib/dates'
import { isoWeekday } from '@/lib/naturalDate'
import { RecurrencePicker } from './RecurrencePicker'
import { describeRecurrence, parseRecurrence } from './recurrence'
import type { Todo, TodoList, TodoPatch } from './types'

type Option = { id: string; name: string }

type Props = {
  todo: Todo
  today: string
  reorderable: boolean
  lists: TodoList[]
  goals: Option[]
  onToggle: (todo: Todo) => void
  onUpdate: (id: string, patch: TodoPatch) => void
  onSnooze: (id: string, due: string) => void
  onDelete: (todo: Todo) => void
}

const small =
  'min-h-9 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text'

/** Lundi suivant (strictement après aujourd'hui). */
export const nextMonday = (today: string) => addDays(today, 8 - isoWeekday(today))

export function TodoItem({
  todo,
  today,
  reorderable,
  lists,
  goals,
  onToggle,
  onUpdate,
  onSnooze,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !reorderable,
  })

  function commitTitle(value: string) {
    setEditing(false)
    const trimmed = value.trim()
    // Un titre vidé est ignoré : on garde l'ancien plutôt que de supprimer par accident.
    if (trimmed && trimmed !== todo.title) onUpdate(todo.id, { title: trimmed })
  }

  const overdue = !todo.done && todo.due_date !== null && todo.due_date < today
  const snoozable = !todo.done && todo.due_date !== null && todo.due_date <= today
  const recurrence = parseRecurrence(todo.recurrence)
  const list = lists.find((l) => l.id === todo.list_id)
  const goal = goals.find((g) => g.id === todo.goal_id)
  const field = 'field min-h-11 px-3 md:min-h-9'

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`card px-2 py-1 transition-shadow ${isDragging ? 'relative z-10 shadow-xl' : ''}`}
    >
      <div className="flex items-center gap-1">
        {reorderable && (
          <button
            type="button"
            aria-label={`Déplacer « ${todo.title} »`}
            className="min-h-11 w-8 shrink-0 cursor-grab touch-none text-muted md:min-h-9"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
        )}
        <Checkbox
          hideLabel
          label={`Terminer « ${todo.title} »`}
          checked={todo.done}
          onChange={() => onToggle(todo)}
        />
        {editing ? (
          <input
            autoFocus
            defaultValue={todo.title}
            aria-label="Modifier la todo"
            onBlur={(e) => commitTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle(e.currentTarget.value)
              if (e.key === 'Escape') setEditing(false)
            }}
            className="field min-h-11 min-w-0 flex-1 px-3 md:min-h-10"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`min-h-11 min-w-0 flex-1 text-left break-words md:min-h-9 ${
              todo.done ? 'text-muted line-through' : ''
            } ${todo.priority === 'high' && !todo.done ? 'font-semibold' : ''}`}
          >
            {todo.title}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1 pb-1 pl-1">
        <input
          type="date"
          value={todo.due_date ?? ''}
          onChange={(e) => onUpdate(todo.id, { due_date: e.target.value || null })}
          aria-label={`Échéance de « ${todo.title} »`}
          className={`min-h-9 rounded-xl border border-transparent bg-transparent px-2 text-xs hover:border-[var(--field-border)] ${
            overdue ? 'text-danger' : 'text-muted'
          }`}
        />
        <button
          type="button"
          aria-pressed={todo.priority === 'high'}
          aria-label={`Priorité haute pour « ${todo.title} »`}
          onClick={() =>
            onUpdate(todo.id, { priority: todo.priority === 'high' ? 'normal' : 'high' })
          }
          className="pill min-h-9 min-w-9 font-semibold"
        >
          !
        </button>
        {snoozable && (
          <>
            <button
              type="button"
              className={small}
              onClick={() => onSnooze(todo.id, addDays(today, 1))}
            >
              Demain
            </button>
            <button
              type="button"
              className={small}
              onClick={() => onSnooze(todo.id, nextMonday(today))}
            >
              Lundi
            </button>
          </>
        )}
        {recurrence && (
          <span className="px-1 text-xs text-muted">↻ {describeRecurrence(recurrence)}</span>
        )}
        {list && <span className="px-1 text-xs text-muted">#{list.name}</span>}
        {goal && <span className="px-1 text-xs text-muted">◎ {goal.name}</span>}
        <span className="ml-auto flex">
          <button
            type="button"
            aria-expanded={open}
            aria-label={`Détails de « ${todo.title} »`}
            onClick={() => setOpen((v) => !v)}
            className={small}
          >
            Détails
          </button>
          <button
            type="button"
            onClick={() => onDelete(todo)}
            aria-label={`Supprimer « ${todo.title} »`}
            className="min-h-9 rounded-full px-3 text-xs text-muted transition-colors hover:text-danger"
          >
            Supprimer
          </button>
        </span>
      </div>

      {open && (
        <div className="mb-2 flex flex-col gap-2 border-t border-border px-1 pt-3">
          <div className="flex flex-wrap gap-2">
            <Select
              label="Liste"
              value={todo.list_id ?? ''}
              onChange={(v) => onUpdate(todo.id, { list_id: v || null })}
              options={[
                { value: '', label: 'Sans liste' },
                ...lists.map((l) => ({ value: l.id, label: l.name })),
              ]}
              className={field}
            />
            <Select
              label="Objectif lié"
              value={todo.goal_id ?? ''}
              onChange={(v) => onUpdate(todo.id, { goal_id: v || null })}
              options={[
                { value: '', label: 'Aucun objectif' },
                ...goals.map((g) => ({ value: g.id, label: g.name })),
              ]}
              className={`${field} max-w-full`}
            />
          </div>
          <RecurrencePicker
            value={todo.recurrence}
            defaultWeekday={isoWeekday(todo.due_date ?? today)}
            onChange={(recurrenceValue) => onUpdate(todo.id, { recurrence: recurrenceValue })}
          />
          {todo.due_date && (
            <p className="text-xs text-muted">Échéance : {formatDue(todo.due_date, today)}</p>
          )}
        </div>
      )}
    </li>
  )
}
