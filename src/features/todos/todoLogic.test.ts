import { filterTodos, nextPosition, reorderPositions } from './todoLogic'
import type { Todo } from './types'

const TODAY = '2026-03-10'

function todo(id: string, overrides: Partial<Todo> = {}): Todo {
  return {
    id,
    list_id: null,
    goal_id: null,
    recurrence: null,
    title: id,
    done: false,
    done_at: null,
    due_date: null,
    priority: 'normal',
    position: 0,
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

const ids = (todos: Todo[]) => todos.map((t) => t.id)

describe('filterTodos', () => {
  const todos = [
    todo('late', { due_date: '2026-03-09', position: 0 }),
    todo('today', { due_date: TODAY, position: 1 }),
    todo('future', { due_date: '2026-03-20', position: 2 }),
    todo('nodate', { position: 3 }),
    todo('done-old', { done: true, done_at: '2026-03-05T10:00:00Z' }),
    todo('done-new', { done: true, done_at: '2026-03-08T10:00:00Z' }),
  ]

  it("'today' inclut les échéances du jour et en retard", () => {
    expect(ids(filterTodos(todos, 'today', TODAY))).toEqual(['late', 'today'])
  })

  it("'upcoming' ne garde que les échéances futures", () => {
    expect(ids(filterTodos(todos, 'upcoming', TODAY))).toEqual(['future'])
  })

  it("'all' garde les todos ouvertes dans l'ordre manuel", () => {
    expect(ids(filterTodos(todos, 'all', TODAY))).toEqual(['late', 'today', 'future', 'nodate'])
  })

  it("'done' renvoie les terminées, la plus récente d'abord", () => {
    expect(ids(filterTodos(todos, 'done', TODAY))).toEqual(['done-new', 'done-old'])
  })

  it('départage les positions égales par date de création', () => {
    const tied = [
      todo('b', { created_at: '2026-03-02T00:00:00Z' }),
      todo('a', { created_at: '2026-03-01T00:00:00Z' }),
    ]
    expect(ids(filterTodos(tied, 'all', TODAY))).toEqual(['a', 'b'])
  })
})

describe('nextPosition', () => {
  it('vaut 0 pour une liste vide, sinon max + 1', () => {
    expect(nextPosition([])).toBe(0)
    expect(nextPosition([todo('a', { position: 4 }), todo('b', { position: 2 })])).toBe(5)
  })
})

describe('reorderPositions', () => {
  const all = [
    todo('a', { position: 0 }),
    todo('b', { position: 1 }),
    todo('c', { position: 2 }),
    todo('d', { position: 3 }),
  ]

  it('déplace un élément et renumérote', () => {
    const updates = reorderPositions(all, all, 'a', 'c')
    expect(updates).toEqual([
      { id: 'b', position: 0 },
      { id: 'c', position: 1 },
      { id: 'a', position: 2 },
    ])
  })

  it('ne fait rien si on dépose au même endroit ou sur un id inconnu', () => {
    expect(reorderPositions(all, all, 'a', 'a')).toEqual([])
    expect(reorderPositions(all, all, 'a', 'zzz')).toEqual([])
  })

  it('garde en place les todos masquées par le filtre', () => {
    // visibles : a et c (b est masquée) ; on échange a et c
    const visible = [all[0]!, all[2]!]
    const updates = reorderPositions(all, visible, 'c', 'a')
    expect(updates).toEqual([
      { id: 'c', position: 0 },
      { id: 'a', position: 2 },
    ])
  })

  it('normalise des positions toutes égales', () => {
    const tied = [
      todo('a', { created_at: '2026-03-01T00:00:00Z' }),
      todo('b', { created_at: '2026-03-02T00:00:00Z' }),
      todo('c', { created_at: '2026-03-03T00:00:00Z' }),
    ]
    const updates = reorderPositions(tied, tied, 'c', 'a')
    // c passe en tête (position 0, inchangée) ; seules a et b changent
    expect(updates).toEqual([
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
    ])
  })
})
