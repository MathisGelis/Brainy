import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import * as checkinsApi from '@/features/checkins/checkinsApi'
import type { DayCheckin } from '@/features/checkins/types'
import * as habitsApi from '@/features/habits/habitsApi'
import * as todosApi from '@/features/todos/todosApi'
import type { Todo } from '@/features/todos/types'
import { addDays, todayISO } from '@/lib/dates'
import { eveningRitualDoneOn } from '@/lib/ritual'
import RitualPage from './RitualPage'

vi.mock('@/features/checkins/checkinsApi')
vi.mock('@/features/todos/todosApi')
vi.mock('@/features/habits/habitsApi')

const today = todayISO()
const todo: Todo = {
  id: 't1',
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  title: 'Répondre à Paul',
  done: false,
  done_at: null,
  due_date: today,
  priority: 'normal',
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/rituel']}>
          <Routes>
            <Route path="/rituel" element={<RitualPage />} />
            <Route path="/" element={<p>Accueil</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('RitualPage', () => {
  beforeEach(() => {
    vi.mocked(checkinsApi.fetchCheckins).mockResolvedValue([])
    localStorage.clear()
    vi.mocked(todosApi.fetchTodos).mockResolvedValue([todo])
    vi.mocked(todosApi.fetchLists).mockResolvedValue([])
    vi.mocked(todosApi.patchTodo).mockResolvedValue()
    vi.mocked(habitsApi.fetchHabits).mockResolvedValue([])
    vi.mocked(habitsApi.fetchLogs).mockResolvedValue([])
    vi.mocked(habitsApi.fetchDaysOff).mockResolvedValue([])
  })

  it('enchaîne les étapes : reporter le reste, puis choisir le Top 3 de demain', async () => {
    let saved: DayCheckin[] = []
    vi.mocked(checkinsApi.fetchCheckins).mockImplementation(async () => saved)
    vi.mocked(checkinsApi.upsertCheckin).mockImplementation(async (c) => {
      saved = [...saved.filter((x) => x.day !== c.day), c]
    })
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Comment s’est passée la journée ?' }),
    ).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Énergie : basse (2 sur 5)' }))
    expect(checkinsApi.upsertCheckin).toHaveBeenCalledWith({
      day: today,
      mood: null,
      energy: 2,
      win: null,
    })
    await userEvent.type(screen.getByLabelText('Une victoire aujourd’hui ?'), 'Appelé Paul{Enter}')
    await waitFor(() =>
      expect(checkinsApi.upsertCheckin).toHaveBeenLastCalledWith({
        day: today,
        mood: null,
        energy: 2,
        win: 'Appelé Paul',
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(screen.getByRole('heading', { name: 'Vos habitudes du jour' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(screen.getByRole('heading', { name: 'Ce qui reste aujourd’hui' })).toBeInTheDocument()
    await screen.findByText('Répondre à Paul')
    await userEvent.click(screen.getByRole('button', { name: 'Demain' }))
    expect(todosApi.patchTodo).toHaveBeenCalledWith('t1', { due_date: addDays(today, 1) })

    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByRole('heading', { name: 'Top 3 de demain' })).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Ajouter « Répondre à Paul » au Top 3' }),
    )
    await waitFor(() =>
      expect(todosApi.patchTodo).toHaveBeenLastCalledWith('t1', { focus_on: addDays(today, 1) }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Précédent' }))
    expect(screen.getByRole('heading', { name: 'Ce qui reste aujourd’hui' })).toBeInTheDocument()
  })

  it('« Terminer » marque le rituel comme fait et revient à l’accueil', async () => {
    renderPage()
    for (let i = 0; i < 3; i++) {
      await userEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    }
    await userEvent.click(screen.getByRole('button', { name: 'Terminer' }))

    expect(await screen.findByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Journée bouclée. Bonne soirée !')).toBeInTheDocument()
    await waitFor(() => expect(eveningRitualDoneOn()).toBe(today))
  })

  it('« Plus tard » revient à l’accueil sans marquer le rituel', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Plus tard' }))
    expect(await screen.findByText('Accueil')).toBeInTheDocument()
    expect(eveningRitualDoneOn()).toBeNull()
  })
})
