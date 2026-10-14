import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui'
import { todayISO } from '@/lib/dates'
import { AddTodoForm } from './AddTodoForm'
import { TodoItem } from './TodoItem'
import { filterTodos, reorderPositions } from './todoLogic'
import type { Todo, TodoFilter } from './types'
import { useTodos } from './useTodos'

const FILTERS: { value: TodoFilter; label: string; empty: string }[] = [
  {
    value: 'today',
    label: "Aujourd'hui",
    empty: "Rien pour aujourd'hui. Profitez-en, ou ajoutez une todo ci-dessus.",
  },
  { value: 'upcoming', label: 'À venir', empty: 'Aucune échéance à venir.' },
  { value: 'all', label: 'Toutes', empty: 'Aucune todo. Tapez un titre ci-dessus puis Entrée.' },
  { value: 'done', label: 'Terminées', empty: 'Aucune todo terminée pour le moment.' },
]

export default function TodosPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<TodoFilter>('all')
  const {
    todos,
    isLoading,
    isError,
    refetch,
    addTodo,
    restoreTodo,
    updateTodo,
    setDone,
    deleteTodo,
    reorderTodos,
  } = useTodos({ onError: (message) => toast.show(message) })

  const today = todayISO()
  const visible = filterTodos(todos, filter, today)
  const reorderable = filter !== 'done'
  const current = FILTERS.find((f) => f.value === filter)!

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return
    reorderTodos(reorderPositions(todos, visible, String(active.id), String(over.id)))
  }

  function onToggle(todo: Todo) {
    const done = !todo.done
    setDone(todo.id, done)
    toast.show(done ? 'Todo terminée' : 'Todo rouverte', () => setDone(todo.id, !done))
  }

  function onDelete(todo: Todo) {
    deleteTodo(todo.id)
    toast.show('Todo supprimée', () => restoreTodo(todo))
  }

  return (
    <>
      <PageHeader title="Todo" />
      <AddTodoForm defaultDue={filter === 'today' ? today : null} onAdd={addTodo} />

      <div role="group" aria-label="Filtres" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`min-h-11 rounded px-3 md:min-h-9 ${
              filter === f.value
                ? 'bg-surface font-semibold text-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isError ? (
        <p role="alert" className="text-danger">
          Impossible de charger les todos.{' '}
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-11 font-semibold underline"
          >
            Réessayer
          </button>
        </p>
      ) : isLoading ? (
        <div aria-hidden className="h-24 animate-pulse rounded bg-surface" />
      ) : visible.length === 0 ? (
        <p className="text-muted">{current.empty}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {visible.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  today={today}
                  reorderable={reorderable}
                  onToggle={onToggle}
                  onUpdate={updateTodo}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </>
  )
}
