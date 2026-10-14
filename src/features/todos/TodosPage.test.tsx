import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui'
import * as api from './todosApi'
import TodosPage from './TodosPage'
import type { Todo } from './types'

vi.mock('./todosApi')

const pain: Todo = {
  id: 't1',
  list_id: null,
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

  it('coche une todo et propose « Annuler »', async () => {
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
