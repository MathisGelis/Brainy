import { useQuery, useQueryClient } from '@tanstack/react-query'
import { todayISO } from '@/lib/dates'
import { fold } from '@/lib/naturalDate'
import { useOptimisticMutation } from '@/lib/useOptimisticMutation'
import { nextOccurrence, parseRecurrence } from './recurrence'
import {
  fetchLists,
  fetchTodos,
  insertList,
  insertTodo,
  patchList,
  patchPositions,
  patchTodo,
  removeList,
  removeTodo,
} from './todosApi'
import { applyPatch, nextPosition } from './todoLogic'
import type { PositionUpdate, Priority, Todo, TodoList, TodoPatch } from './types'

export const TODOS_KEY = ['todos'] as const
export const LISTS_KEY = ['todo_lists'] as const

type Options = { onError?: (message: string) => void }

export type NewTodoInput = {
  title: string
  due_date?: string | null
  priority?: Priority
  recurrence?: string | null
  list_id?: string | null
  goal_id?: string | null
  focus_on?: string | null
}

export function useTodos({ onError }: Options = {}) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: TODOS_KEY, queryFn: fetchTodos })

  // Une liste créée à la volée (« #maison ») est enregistrée avant la todo (clé étrangère).
  const add = useOptimisticMutation<Todo, { todo: Todo; newList?: TodoList }>(
    TODOS_KEY,
    async ({ todo, newList }) => {
      if (newList) await insertList(newList)
      await insertTodo(todo)
    },
    (todos, { todo }) => [...todos.filter((t) => t.id !== todo.id), todo],
    onError,
    [LISTS_KEY],
  )
  const update = useOptimisticMutation<Todo, { id: string; patch: TodoPatch }>(
    TODOS_KEY,
    ({ id, patch }) => patchTodo(id, patch),
    (todos, { id, patch }) => todos.map((t) => (t.id === id ? applyPatch(t, patch) : t)),
    onError,
  )
  const remove = useOptimisticMutation<Todo, string>(
    TODOS_KEY,
    removeTodo,
    (todos, id) => todos.filter((t) => t.id !== id),
    onError,
  )
  const reorder = useOptimisticMutation<Todo, PositionUpdate[]>(
    TODOS_KEY,
    patchPositions,
    (todos, updates) =>
      todos.map((t) => {
        const u = updates.find((x) => x.id === t.id)
        return u ? applyPatch(t, { position: u.position }) : t
      }),
    onError,
  )

  const todos = query.data ?? []

  const build = (input: NewTodoInput, position = nextPosition(todos)): Todo => ({
    id: crypto.randomUUID(),
    list_id: input.list_id ?? null,
    goal_id: input.goal_id ?? null,
    title: input.title,
    done: false,
    done_at: null,
    due_date: input.due_date ?? null,
    priority: input.priority ?? 'normal',
    recurrence: input.recurrence ?? null,
    focus_on: input.focus_on ?? null,
    position,
    created_at: new Date().toISOString(),
  })

  const setDone = (id: string, done: boolean) =>
    update.mutate({ id, patch: { done, done_at: done ? new Date().toISOString() : null } })

  return {
    todos,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,

    /** Ajoute une todo (et la liste `newList` si elle vient d'être créée) ; renvoie son id. */
    addTodo: (input: NewTodoInput, newList?: TodoList): string => {
      if (newList) {
        queryClient.setQueryData<TodoList[]>(LISTS_KEY, (old) => [...(old ?? []), newList])
      }
      const todo = build(input)
      add.mutate({ todo, newList })
      return todo.id
    },
    /** Remet une todo supprimée (annulation), avec son id d'origine. */
    restoreTodo: (todo: Todo) => add.mutate({ todo }),
    updateTodo: (id: string, patch: TodoPatch) => update.mutate({ id, patch }),
    setDone,
    /**
     * Termine une todo. Pour une todo récurrente, crée aussitôt l'occurrence suivante.
     * Renvoie la fonction d'annulation (rouvre la todo et retire l'occurrence créée).
     */
    completeTodo: (todo: Todo): (() => void) => {
      setDone(todo.id, true)
      const recurrence = parseRecurrence(todo.recurrence)
      let nextId: string | null = null
      if (recurrence) {
        const next = build(
          {
            title: todo.title,
            priority: todo.priority,
            recurrence: todo.recurrence,
            list_id: todo.list_id,
            goal_id: todo.goal_id,
            due_date: nextOccurrence(recurrence, todo.due_date, todayISO()),
          },
          todo.position,
        )
        nextId = next.id
        add.mutate({ todo: next })
      }
      return () => {
        setDone(todo.id, false)
        if (nextId) remove.mutate(nextId)
      }
    },
    /** Place la todo dans le Top 3 d'un jour (null : l'en retire). */
    setFocus: (id: string, day: string | null) => update.mutate({ id, patch: { focus_on: day } }),
    /** Reporte l'échéance (« Demain », « Lundi »…). */
    snoozeTodo: (id: string, due_date: string) => update.mutate({ id, patch: { due_date } }),
    deleteTodo: (id: string) => remove.mutate(id),
    reorderTodos: (updates: PositionUpdate[]) => {
      if (updates.length > 0) reorder.mutate(updates)
    },
  }
}

/** Liste par nom, sans tenir compte de la casse ni des accents. */
export function findListByName(lists: TodoList[], name: string): TodoList | undefined {
  const target = fold(name.trim())
  return lists.find((l) => fold(l.name.trim()) === target)
}

export function useTodoLists({ onError }: Options = {}) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: LISTS_KEY, queryFn: fetchLists })
  const lists = query.data ?? []

  const add = useOptimisticMutation<TodoList, TodoList>(
    LISTS_KEY,
    insertList,
    (all, list) => [...all.filter((l) => l.id !== list.id), list],
    onError,
  )
  const rename = useOptimisticMutation<TodoList, { id: string; name: string }>(
    LISTS_KEY,
    ({ id, name }) => patchList(id, { name }),
    (all, { id, name }) => all.map((l) => (l.id === id ? { ...l, name } : l)),
    onError,
  )
  const remove = useOptimisticMutation<TodoList, string>(
    LISTS_KEY,
    removeList,
    (all, id) => all.filter((l) => l.id !== id),
    onError,
    [TODOS_KEY],
  )
  // Annulation : recréer la liste puis y rattacher ses todos, dans une seule requête
  const restore = useOptimisticMutation<TodoList, { list: TodoList; ids: string[] }>(
    LISTS_KEY,
    async ({ list, ids }) => {
      await insertList(list)
      await Promise.all(ids.map((id) => patchTodo(id, { list_id: list.id })))
    },
    (all, { list }) => [...all.filter((l) => l.id !== list.id), list],
    onError,
    [TODOS_KEY],
  )

  const makeList = (name: string): TodoList => ({
    id: crypto.randomUUID(),
    name: name.trim(),
    position: lists.reduce((max, l) => Math.max(max, l.position), -1) + 1,
  })

  return {
    lists,
    isLoading: query.isPending,
    makeList,
    addList: (name: string) => add.mutate(makeList(name)),
    renameList: (id: string, name: string) => rename.mutate({ id, name }),
    /** Supprime une liste ; ses todos restent sans liste. Renvoie l'annulation. */
    deleteList: (list: TodoList): (() => void) => {
      const affected = (queryClient.getQueryData<Todo[]>(TODOS_KEY) ?? [])
        .filter((t) => t.list_id === list.id)
        .map((t) => t.id)
      queryClient.setQueryData<Todo[]>(TODOS_KEY, (old) =>
        (old ?? []).map((t) => (t.list_id === list.id ? { ...t, list_id: null } : t)),
      )
      remove.mutate(list.id)
      return () => {
        queryClient.setQueryData<Todo[]>(TODOS_KEY, (old) =>
          (old ?? []).map((t) => (affected.includes(t.id) ? { ...t, list_id: list.id } : t)),
        )
        restore.mutate({ list, ids: affected })
      }
    },
  }
}

/** Ajout depuis une saisie analysée : résout (ou crée) la liste nommée « #nom ». */
export function useQuickTodo({
  onError,
  defaultListId = null,
}: Options & { defaultListId?: string | null } = {}) {
  const { addTodo } = useTodos({ onError })
  const { lists, makeList } = useTodoLists({ onError })
  return (input: NewTodoInput & { listName?: string | null }) => {
    const { listName, ...todo } = input
    let listId = todo.list_id ?? defaultListId
    let newList: TodoList | undefined
    if (listName) {
      const found = findListByName(lists, listName)
      if (found) listId = found.id
      else {
        newList = makeList(listName)
        listId = newList.id
      }
    }
    return addTodo({ ...todo, list_id: listId }, newList)
  }
}
