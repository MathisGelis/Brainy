import type { PositionUpdate, Todo, TodoFilter, TodoPatch } from './types'

const byPosition = (a: Todo, b: Todo) =>
  a.position - b.position || a.created_at.localeCompare(b.created_at)

/** Todos non terminées, dans l'ordre manuel. */
export function sortOpen(todos: Todo[]): Todo[] {
  return todos.filter((t) => !t.done).sort(byPosition)
}

/**
 * Filtre et ordonne pour l'affichage.
 * - today : échéance aujourd'hui ou en retard
 * - upcoming : échéance dans le futur
 * - all : toutes les todos ouvertes
 * - done : terminées, la plus récente d'abord
 */
export function filterTodos(todos: Todo[], filter: TodoFilter, today: string): Todo[] {
  if (filter === 'done') {
    return todos
      .filter((t) => t.done)
      .sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))
  }
  const open = sortOpen(todos)
  switch (filter) {
    case 'today':
      return open.filter((t) => t.due_date !== null && t.due_date <= today)
    case 'upcoming':
      return open.filter((t) => t.due_date !== null && t.due_date > today)
    case 'all':
      return open
  }
}

/** Position pour ajouter en fin de liste. */
export function nextPosition(todos: Todo[]): number {
  return todos.reduce((max, t) => Math.max(max, t.position), -1) + 1
}

export function applyPatch(todo: Todo, patch: TodoPatch): Todo {
  return { ...todo, ...patch }
}

/**
 * Déplace `activeId` à la place de `overId` dans la liste affichée (`visible`),
 * et renvoie les nouvelles positions (0..n-1) de toutes les todos ouvertes qui changent.
 * Les todos masquées par le filtre gardent leur place relative.
 */
export function reorderPositions(
  todos: Todo[],
  visible: Todo[],
  activeId: string,
  overId: string,
): PositionUpdate[] {
  const from = visible.findIndex((t) => t.id === activeId)
  const to = visible.findIndex((t) => t.id === overId)
  if (from === -1 || to === -1 || from === to) return []

  const moved = [...visible]
  const [item] = moved.splice(from, 1)
  moved.splice(to, 0, item!)

  const open = sortOpen(todos)
  const visibleIds = new Set(visible.map((t) => t.id))
  const slots = open.flatMap((t, i) => (visibleIds.has(t.id) ? [i] : []))
  const result = [...open]
  slots.forEach((slot, i) => {
    result[slot] = moved[i]!
  })

  return result
    .map((t, i) => ({ id: t.id, position: i, changed: t.position !== i }))
    .filter((u) => u.changed)
    .map(({ id, position }) => ({ id, position }))
}
