import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui'
import * as goalsApi from '@/features/goals/goalsApi'
import { addDays, todayISO } from '@/lib/dates'
import * as api from './todosApi'
import TodosPage from './TodosPage'
import type { Todo } from './types'

vi.mock('./todosApi')
vi.mock('@/features/goals/goalsApi')

const pain: Todo = {
  id: 't1',
  list_id: null,
  goal_id: null,
  recurrence: null,
  title: 'Acheter du pain',
  done: false,
  done_at: null,
  due_date: null,
  priority: 'normal',
  position: 0,
  created_at: '2026-03-01T00:00:00Z',
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <TodosPage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('TodosPage', () => {
  beforeEach(() => {
    vi.mocked(api.fetchTodos).mockResolvedValue([pain])
    vi.mocked(api.fetchLists).mockResolvedValue([])
    vi.mocked(goalsApi.fetchGoals).mockResolvedValue([])
    vi.mocked(goalsApi.fetchMilestones).mockResolvedValue([])
    vi.mocked(api.patchTodo).mockReturnValue(new Promise<void>(() => {}))
    vi.mocked(api.insertTodo).mockReturnValue(new Promise<void>(() => {}))
  })

  it('ajoute une todo avec Entrée, vide le champ et garde le focus', async () => {
    renderPage()
    await screen.findByText('Acheter du pain')
    const input = screen.getByLabelText('Nouvelle todo')

    await userEvent.type(input, 'Appeler Léa{Enter}')

    expect(await screen.findByText('Appeler Léa')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('comprend la saisie naturelle et crée la liste avant la todo', async () => {
    const order: string[] = []
    vi.mocked(api.insertList).mockImplementation(async () => {
      order.push('liste')
    })
    vi.mocked(api.insertTodo).mockImplementation(async () => {
      order.push('todo')
    })
    renderPage()
    await screen.findByText('Acheter du pain')
    const input = screen.getByLabelText('Nouvelle todo')

    await userEvent.type(input, 'Payer le loyer demain ! #maison')
    expect(screen.getByText('Demain')).toBeInTheDocument() // aperçu de ce qui est compris
    expect(screen.getByText('#maison')).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(order).toEqual(['liste', 'todo']))
    const list = vi.mocked(api.insertList).mock.calls[0]![0]
    expect(list.name).toBe('maison')
    expect(api.insertTodo).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Payer le loyer',
        due_date: addDays(todayISO(), 1),
        priority: 'high',
        list_id: list.id,
      }),
    )
  })

  it('termine une todo récurrente : occurrence suivante créée, annulable', async () => {
    const today = todayISO()
    vi.mocked(api.fetchTodos).mockResolvedValue([{ ...pain, due_date: today, recurrence: 'daily' }])
    vi.mocked(api.patchTodo).mockResolvedValue()
    vi.mocked(api.insertTodo).mockResolvedValue()
    vi.mocked(api.removeTodo).mockResolvedValue()
    renderPage()

    await userEvent.click(await screen.findByRole('checkbox', { name: /Acheter du pain/ }))
    await waitFor(() =>
      expect(api.insertTodo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Acheter du pain',
          due_date: addDays(today, 1),
          recurrence: 'daily',
        }),
      ),
    )
    const next = vi.mocked(api.insertTodo).mock.calls[0]![0]

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(api.removeTodo).toHaveBeenCalledWith(next.id))
    expect(api.patchTodo).toHaveBeenCalledWith('t1', expect.objectContaining({ done: false }))
  })

  it('reporte une todo en retard à demain en un clic', async () => {
    const today = todayISO()
    vi.mocked(api.fetchTodos).mockResolvedValue([{ ...pain, due_date: addDays(today, -2) }])
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Demain' }))
    expect(api.patchTodo).toHaveBeenCalledWith('t1', { due_date: addDays(today, 1) })
  })

  it('supprime une liste (la todo reste) puis l’annule', async () => {
    const maison = { id: 'l1', name: 'maison', position: 0 }
    vi.mocked(api.fetchLists).mockResolvedValue([maison])
    vi.mocked(api.fetchTodos).mockResolvedValue([{ ...pain, list_id: 'l1' }])
    vi.mocked(api.removeList).mockResolvedValue()
    vi.mocked(api.insertList).mockResolvedValue()
    vi.mocked(api.patchTodo).mockResolvedValue()
    renderPage()
    expect(await screen.findByText('#maison', { selector: 'li span' })).toBeInTheDocument()

    await userEvent.click(screen.getByText('Listes et projets'))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer la liste maison' }))

    expect(api.removeList).toHaveBeenCalledWith('l1')
    expect(screen.getByText('Acheter du pain')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(api.insertList).toHaveBeenCalledWith(maison))
    await waitFor(() => expect(api.patchTodo).toHaveBeenCalledWith('t1', { list_id: 'l1' }))
  })

  it('modifie liste et récurrence depuis les détails', async () => {
    vi.mocked(api.fetchLists).mockResolvedValue([{ id: 'l1', name: 'maison', position: 0 }])
    vi.mocked(api.patchTodo).mockResolvedValue()
    renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Détails de « Acheter du pain »' }),
    )

    await userEvent.selectOptions(screen.getByLabelText('Liste'), 'l1')
    expect(api.patchTodo).toHaveBeenCalledWith('t1', { list_id: 'l1' })

    await userEvent.selectOptions(screen.getByLabelText('Récurrence'), 'weekly')
    await waitFor(() => expect(api.patchTodo).toHaveBeenCalledTimes(2))
    expect(api.patchTodo).toHaveBeenLastCalledWith('t1', {
      recurrence: expect.stringMatching(/^weekly:[1-7]$/),
    })
  })

  it('coche une todo et propose « Annuler »', async () => {
    vi.mocked(api.patchTodo).mockResolvedValue()
    renderPage()
    await userEvent.click(await screen.findByRole('checkbox', { name: /Acheter du pain/ }))

    expect(await screen.findByText('Todo terminée')).toBeInTheDocument()
    expect(api.patchTodo).toHaveBeenCalledWith('t1', expect.objectContaining({ done: true }))

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() =>
      expect(api.patchTodo).toHaveBeenLastCalledWith(
        't1',
        expect.objectContaining({ done: false }),
      ),
    )
  })

  it('édite le titre en ligne', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Acheter du pain' }))
    const field = screen.getByLabelText('Modifier la todo')
    await userEvent.clear(field)
    await userEvent.type(field, 'Acheter des fruits{Enter}')

    expect(api.patchTodo).toHaveBeenCalledWith('t1', { title: 'Acheter des fruits' })
  })

  it('affiche un état vide utile', async () => {
    vi.mocked(api.fetchTodos).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/Aucune todo\. Tapez un titre/)).toBeInTheDocument()
  })
})
