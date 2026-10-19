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
import { useGoals } from '@/features/goals/useGoals'
import { celebrate } from '@/lib/celebrate'
import { todayISO } from '@/lib/dates'
import { AddTodoForm } from './AddTodoForm'
import { ListsManager } from './ListsManager'
import { TodoItem } from './TodoItem'
import { filterTodos, reorderPositions } from './todoLogic'
import type { Todo, TodoFilter, TodoList } from './types'
import { useQuickTodo, useTodoLists, useTodos } from './useTodos'

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
  /** Liste affichée : null = toutes les listes */
  const [listFilter, setListFilter] = useState<string | null>(null)
  const onError = (message: string) => toast.show(message)
  const {
    todos,
    isLoading,
    isError,
    refetch,
    restoreTodo,
    updateTodo,
    setDone,
    completeTodo,
    snoozeTodo,
    deleteTodo,
    reorderTodos,
  } = useTodos({ onError })
  const { lists, addList, renameList, deleteList } = useTodoLists({ onError })
  const addQuick = useQuickTodo({ onError, defaultListId: listFilter })
  const { goals } = useGoals({ onError })
  const goalOptions = goals
    .filter((g) => g.status === 'active' || todos.some((t) => t.goal_id === g.id))
    .map((g) => ({ id: g.id, name: g.title }))

  const today = todayISO()
  const visible = filterTodos(todos, filter, today).filter(
    (t) => listFilter === null || t.list_id === listFilter,
  )
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
    if (todo.done) {
      setDone(todo.id, false)
      toast.show('Todo rouverte', () => setDone(todo.id, true))
      return
    }
    const undo = completeTodo(todo)
    celebrate()
    toast.show(todo.recurrence ? 'Terminée, prochaine occurrence planifiée' : 'Todo terminée', undo)
  }

  function onDeleteList(list: TodoList) {
    if (listFilter === list.id) setListFilter(null)
    const undo = deleteList(list)
    toast.show(`Liste « ${list.name} » supprimée`, undo)
  }

  function onDelete(todo: Todo) {
    deleteTodo(todo.id)
    toast.show('Todo supprimée', () => restoreTodo(todo))
  }

  return (
    <>
      <PageHeader title="Todo" />
      <AddTodoForm defaultDue={filter === 'today' ? today : null} onAdd={addQuick} />

      {lists.length > 0 && (
        <div role="group" aria-label="Listes" className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={listFilter === null}
            onClick={() => setListFilter(null)}
            className="pill min-h-9 border border-[var(--field-border)] px-3 text-xs"
          >
            Toutes les listes
          </button>
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={listFilter === l.id}
              onClick={() => setListFilter(listFilter === l.id ? null : l.id)}
              className="pill min-h-9 border border-[var(--field-border)] px-3 text-xs"
            >
              #{l.name}
            </button>
          ))}
        </div>
      )}

      <div
        role="group"
        aria-label="Filtres"
        className="mb-5 grid w-full grid-cols-4 gap-1 rounded-full bg-surface p-1 md:inline-flex md:w-auto"
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className="pill min-h-10 px-1 text-xs whitespace-nowrap md:min-h-9 md:px-4 md:text-sm"
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
        <div aria-hidden className="h-24 animate-pulse rounded-2xl bg-surface" />
      ) : visible.length === 0 ? (
        <p className="text-muted">
          {listFilter ? 'Aucune todo ici dans cette liste.' : current.empty}
        </p>
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
                  lists={lists}
                  goals={goalOptions}
                  onToggle={onToggle}
                  onUpdate={updateTodo}
                  onSnooze={snoozeTodo}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <ListsManager lists={lists} onAdd={addList} onRename={renameList} onDelete={onDeleteList} />
    </>
  )
}
