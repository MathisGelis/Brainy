import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { Checkbox } from '@/components/ui'
import type { Todo, TodoPatch } from './types'

type Props = {
  todo: Todo
  today: string
  reorderable: boolean
  onToggle: (todo: Todo) => void
  onUpdate: (id: string, patch: TodoPatch) => void
  onDelete: (todo: Todo) => void
}

export function TodoItem({ todo, today, reorderable, onToggle, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
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

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded border border-border bg-bg px-2 py-1 ${isDragging ? 'opacity-60' : ''}`}
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
            className="min-h-11 min-w-0 flex-1 rounded border border-border bg-bg px-2 text-text md:min-h-9"
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
      <div className="flex items-center gap-2 pb-1 pl-1">
        <input
          type="date"
          value={todo.due_date ?? ''}
          onChange={(e) => onUpdate(todo.id, { due_date: e.target.value || null })}
          aria-label={`Échéance de « ${todo.title} »`}
          className={`min-h-9 rounded border border-transparent bg-transparent px-1 text-xs hover:border-border ${
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
          className={`min-h-9 min-w-9 rounded font-semibold ${
            todo.priority === 'high' ? 'text-accent' : 'text-muted'
          }`}
        >
          !
        </button>
        <button
          type="button"
          onClick={() => onDelete(todo)}
          aria-label={`Supprimer « ${todo.title} »`}
          className="ml-auto min-h-9 px-2 text-xs text-muted hover:text-danger"
        >
          Supprimer
        </button>
      </div>
    </li>
  )
}
