import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import * as api from './todosApi'
import { useTodos } from './useTodos'
import type { Todo } from './types'

vi.mock('./todosApi')

const base: Todo = {
  id: 't1',
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  title: 'Acheter du pain',
  done: false,
  done_at: null,
  due_date: null,
  priority: 'normal',
  position: 0,
  created_at: '2026-03-01T00:00:00Z',
}

function setup(onError?: (m: string) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useTodos({ onError }), { wrapper })
}

describe('useTodos', () => {
  beforeEach(() => {
    vi.mocked(api.fetchTodos).mockResolvedValue([base])
  })

  it('charge les todos', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.todos).toEqual([base]))
  })

  it('coche de façon optimiste, avant la réponse du serveur', async () => {
    let resolve!: () => void
    vi.mocked(api.patchTodo).mockReturnValue(new Promise<void>((r) => (resolve = r)))
    const { result } = setup()
    await waitFor(() => expect(result.current.todos).toHaveLength(1))

    act(() => result.current.setDone('t1', true))

    await waitFor(() => expect(result.current.todos[0]?.done).toBe(true))
    expect(result.current.todos[0]?.done_at).not.toBeNull()
    expect(api.patchTodo).toHaveBeenCalledWith('t1', expect.objectContaining({ done: true }))
    resolve()
  })

  it("annule la modification et prévient l'utilisateur en cas d'erreur", async () => {
    vi.mocked(api.patchTodo).mockRejectedValue(new Error('réseau'))
    const onError = vi.fn()
    const { result } = setup(onError)
    await waitFor(() => expect(result.current.todos).toHaveLength(1))

    act(() => result.current.setDone('t1', true))

    await waitFor(() => expect(onError).toHaveBeenCalled())
    await waitFor(() => expect(result.current.todos[0]?.done).toBe(false))
  })

  it("ajoute en fin de liste avec un id client et l'affiche tout de suite", async () => {
    vi.mocked(api.insertTodo).mockReturnValue(new Promise<void>(() => {}))
    const { result } = setup()
    await waitFor(() => expect(result.current.todos).toHaveLength(1))

    act(() => result.current.addTodo({ title: 'Appeler Léa', priority: 'high' }))

    await waitFor(() => expect(result.current.todos).toHaveLength(2))
    const added = vi.mocked(api.insertTodo).mock.calls[0]![0]
    expect(added).toMatchObject({
      title: 'Appeler Léa',
      priority: 'high',
      position: 1,
      done: false,
    })
    expect(added.id).toBeTruthy()
  })

  it('supprime de façon optimiste', async () => {
    vi.mocked(api.removeTodo).mockReturnValue(new Promise<void>(() => {}))
    const { result } = setup()
    await waitFor(() => expect(result.current.todos).toHaveLength(1))

    act(() => result.current.deleteTodo('t1'))

    await waitFor(() => expect(result.current.todos).toHaveLength(0))
  })

  it('envoie la restauration seulement après la fin de la suppression', async () => {
    let finishDelete!: () => void
    vi.mocked(api.removeTodo).mockReturnValue(new Promise<void>((r) => (finishDelete = r)))
    vi.mocked(api.insertTodo).mockReturnValue(new Promise<void>(() => {}))
    const { result } = setup()
    await waitFor(() => expect(result.current.todos).toHaveLength(1))

    act(() => result.current.deleteTodo('t1'))
    act(() => result.current.restoreTodo(base))

    // affichage immédiat, requête de restauration en attente
    await waitFor(() => expect(result.current.todos).toHaveLength(1))
    expect(api.insertTodo).not.toHaveBeenCalled()

    finishDelete()
    await waitFor(() => expect(api.insertTodo).toHaveBeenCalledWith(base))
  })
})
