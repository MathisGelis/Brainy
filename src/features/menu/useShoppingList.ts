import { findListByName, useTodoLists, useTodos } from '@/features/todos/useTodos'
import type { Todo, TodoList } from '@/features/todos/types'
import { missingFromShopping } from './nutrition'

/** Nom de la liste de todos qui sert de liste de courses. */
export const SHOPPING_LIST = 'Courses'

const byPosition = (a: Todo, b: Todo) =>
  a.position - b.position || a.created_at.localeCompare(b.created_at)

/** Liste de courses : une liste de todos « Courses », partagée avec l'onglet Todo. */
export function useShoppingList({ onError }: { onError?: (message: string) => void } = {}) {
  const { todos, isLoading, addTodo, completeTodo, setDone, deleteTodo, restoreTodo } = useTodos({
    onError,
  })
  const { lists, isLoading: listsLoading, makeList } = useTodoLists({ onError })
  const list = findListByName(lists, SHOPPING_LIST)
  const items = list ? todos.filter((t) => t.list_id === list.id && !t.done).sort(byPosition) : []
  const titles = items.map((t) => t.title)

  return {
    list,
    items,
    isLoading: isLoading || listsLoading,
    /** Aliments absents de la liste (nom de base, sans doublon). */
    missing: (names: string[]) => missingFromShopping(names, titles),
    /**
     * Ajoute ceux qui manquent (en créant la liste au besoin).
     * Renvoie les titres ajoutés et l'annulation.
     */
    add: (names: string[]): { added: string[]; undo: () => void } => {
      const fresh = missingFromShopping(names, titles)
      if (fresh.length === 0) return { added: [], undo: () => {} }
      let target: TodoList | undefined = list
      let newList: TodoList | undefined
      if (!target) {
        newList = makeList(SHOPPING_LIST)
        target = newList
      }
      const listId = target.id
      const ids = fresh.map((title, i) =>
        addTodo({ title, list_id: listId }, i === 0 ? newList : undefined),
      )
      return { added: fresh, undo: () => ids.forEach((id) => deleteTodo(id)) }
    },
    /** Coche un article (acheté) ; renvoie l'annulation. */
    check: (todo: Todo) => completeTodo(todo),
    uncheck: (todo: Todo) => setDone(todo.id, false),
    remove: (todo: Todo): (() => void) => {
      deleteTodo(todo.id)
      return () => restoreTodo(todo)
    },
  }
}
