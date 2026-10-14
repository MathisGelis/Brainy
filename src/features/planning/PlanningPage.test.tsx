import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import * as todosApi from '@/features/todos/todosApi'
import type { Todo } from '@/features/todos/types'
import { addDays, formatLongDay, todayISO } from '@/lib/dates'
import { weekPlannedFor } from '@/lib/ritual'
import { planningMonday } from './planningLogic'
import PlanningPage from './PlanningPage'

vi.mock('@/features/todos/todosApi')

const today = todayISO()
const monday = planningMonday(today)
const sunday = addDays(monday, 6)
const base: Omit<Todo, 'id' | 'title'> = {
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  focus_week: null,
  done: false,
  done_at: null,
  due_date: null,
  priority: 'normal',
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}
let server: Todo[] = []

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/semaine']}>
          <Routes>
            <Route path="/semaine" element={<PlanningPage />} />
            <Route path="/" element={<p>Accueil</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('PlanningPage', () => {
  beforeEach(() => {
    localStorage.clear()
    server = [
      { ...base, id: 't1', title: 'Rappeler le garagiste', due_date: addDays(today, -3) },
      { ...base, id: 't2', title: 'Ranger la cave', position: 1 },
      { ...base, id: 't3', title: 'Préparer l’entretien', priority: 'high', position: 2 },
    ]
    vi.mocked(todosApi.fetchTodos).mockImplementation(async () => server.map((t) => ({ ...t })))
    vi.mocked(todosApi.fetchLists).mockResolvedValue([])
    vi.mocked(todosApi.patchTodo).mockImplementation(async (id, patch) => {
      server = server.map((t) => (t.id === id ? { ...t, ...patch } : t))
    })
  })

  it('reprend ce qui traîne, choisit une priorité, répartit, puis termine', async () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Ce qui traîne' })).toBeInTheDocument()
    await userEvent.click(
      await screen.findByRole('button', {
        name: `Planifier « Rappeler le garagiste » le ${formatLongDay(sunday)}`,
      }),
    )
    await waitFor(() => expect(todosApi.patchTodo).toHaveBeenCalledWith('t1', { due_date: sunday }))
    expect(await screen.findByText('Rien ne traîne. Bien joué.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Ajouter « Préparer l’entretien » aux priorités de la semaine',
      }),
    )
    await waitFor(() =>
      expect(todosApi.patchTodo).toHaveBeenCalledWith('t3', { focus_week: monday }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByRole('heading', { name: 'Répartir sur les jours' })).toBeInTheDocument()
    const groups = await screen.findAllByRole('group', { name: /^Jour pour/ })
    // la priorité de la semaine passe en premier
    expect(groups[0]).toHaveAccessibleName('Jour pour « Préparer l’entretien »')
    await userEvent.click(
      screen.getByRole('button', {
        name: `Planifier « Ranger la cave » le ${formatLongDay(sunday)}`,
      }),
    )
    await waitFor(() => expect(todosApi.patchTodo).toHaveBeenCalledWith('t2', { due_date: sunday }))
    const load = screen.getByRole('list', { name: 'Charge de la semaine' })
    await waitFor(() =>
      expect(within(load).getByText(`${formatLongDay(sunday)} : 2 todos`)).toBeInTheDocument(),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(await screen.findByText('Accueil')).toBeInTheDocument()
    expect(weekPlannedFor()).toBe(monday)
  })

  it('« Sans date » retire l’échéance d’une todo en retard, annulable', async () => {
    renderPage()
    await screen.findByText('Rappeler le garagiste')
    await userEvent.click(screen.getByRole('button', { name: 'Sans date' }))
    await waitFor(() => expect(todosApi.patchTodo).toHaveBeenCalledWith('t1', { due_date: null }))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() =>
      expect(todosApi.patchTodo).toHaveBeenLastCalledWith('t1', {
        due_date: addDays(today, -3),
      }),
    )
  })
})
