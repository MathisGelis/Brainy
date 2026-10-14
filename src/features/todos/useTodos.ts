import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTodos, insertTodo, patchPositions, patchTodo, removeTodo } from './todosApi'
import { applyPatch, nextPosition } from './todoLogic'
import type { PositionUpdate, Priority, Todo, TodoPatch } from './types'

export const TODOS_KEY = ['todos'] as const

/**
 * Mutation à mise à jour optimiste : le cache est modifié tout de suite,
 * restauré en cas d'erreur, puis resynchronisé avec le serveur.
 */
function useOptimisticMutation<V>(
  request: (variables: V) => Promise<unknown>,
  apply: (todos: Todo[], variables: V) => Todo[],
  onError?: (message: string) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onMutate: async (variables: V) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY })
      const previous = queryClient.getQueryData<Todo[]>(TODOS_KEY)
      queryClient.setQueryData<Todo[]>(TODOS_KEY, (old) => apply(old ?? [], variables))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(TODOS_KEY, context.previous)
      onError?.("L'enregistrement a échoué. Vos modifications ont été annulées.")
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TODOS_KEY }),
  })
}

export type NewTodoInput = { title: string; due_date?: string | null; priority?: Priority }

export function useTodos({ onError }: { onError?: (message: string) => void } = {}) {
  const query = useQuery({ queryKey: TODOS_KEY, queryFn: fetchTodos })

  const add = useOptimisticMutation<Todo>(insertTodo, (todos, todo) => [...todos, todo], onError)
  const update = useOptimisticMutation<{ id: string; patch: TodoPatch }>(
    ({ id, patch }) => patchTodo(id, patch),
    (todos, { id, patch }) => todos.map((t) => (t.id === id ? applyPatch(t, patch) : t)),
    onError,
  )
  const remove = useOptimisticMutation<string>(
    removeTodo,
    (todos, id) => todos.filter((t) => t.id !== id),
    onError,
  )
  const reorder = useOptimisticMutation<PositionUpdate[]>(
    patchPositions,
    (todos, updates) =>
      todos.map((t) => {
        const u = updates.find((x) => x.id === t.id)
        return u ? applyPatch(t, { position: u.position }) : t
      }),
    onError,
  )

  const todos = query.data ?? []

  return {
    todos,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,

    addTodo: ({ title, due_date = null, priority = 'normal' }: NewTodoInput) =>
      add.mutate({
        id: crypto.randomUUID(),
        list_id: null,
        title,
        done: false,
        done_at: null,
        due_date,
        priority,
        position: nextPosition(todos),
        created_at: new Date().toISOString(),
      }),
    /** Remet une todo supprimée (annulation), avec son id d'origine. */
    restoreTodo: (todo: Todo) => add.mutate(todo),
    updateTodo: (id: string, patch: TodoPatch) => update.mutate({ id, patch }),
    setDone: (id: string, done: boolean) =>
      update.mutate({ id, patch: { done, done_at: done ? new Date().toISOString() : null } }),
    deleteTodo: (id: string) => remove.mutate(id),
    reorderTodos: (updates: PositionUpdate[]) => {
      if (updates.length > 0) reorder.mutate(updates)
    },
  }
}
