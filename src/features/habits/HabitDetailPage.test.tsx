import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import * as goalsApi from '@/features/goals/goalsApi'
import * as api from './habitsApi'
import HabitDetailPage from './HabitDetailPage'
import type { Habit } from './types'

vi.mock('./habitsApi')
vi.mock('@/features/goals/goalsApi')

const habit: Habit = {
  id: 'h1',
  name: 'Lecture',
  target_per_week: 7,
  days: null,
  goal_amount: null,
  unit: null,
  goal_id: null,
  archived: false,
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/habitudes/h1']}>
          <Routes>
            <Route path="/habitudes/:habitId" element={<HabitDetailPage />} />
            <Route path="/habitudes" element={<p>Liste des habitudes</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('HabitDetailPage', () => {
  beforeEach(() => {
    vi.mocked(api.fetchHabits).mockResolvedValue([habit])
    vi.mocked(api.fetchLogs).mockResolvedValue([])
    vi.mocked(api.fetchDaysOff).mockResolvedValue([])
    vi.mocked(goalsApi.fetchGoals).mockResolvedValue([])
    vi.mocked(goalsApi.fetchMilestones).mockResolvedValue([])
    vi.mocked(api.patchHabit).mockResolvedValue()
  })

  it('rend l’habitude chiffrée depuis le détail', async () => {
    renderPage()
    const goal = await screen.findByLabelText('Objectif chiffré par jour')
    await userEvent.type(goal, '20')
    await userEvent.tab()
    expect(api.patchHabit).toHaveBeenCalledWith('h1', { goal_amount: 20 })
  })

  it('supprime l’habitude et son historique, puis restaure tout avec « Annuler »', async () => {
    const history = [{ id: 'l1', habit_id: 'h1', day: '2020-01-01', amount: null }]
    vi.mocked(api.fetchHabitLogs).mockResolvedValue(history)
    vi.mocked(api.removeHabit).mockResolvedValue()
    vi.mocked(api.insertHabit).mockResolvedValue()
    vi.mocked(api.insertLogs).mockResolvedValue()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer définitivement' }))
    expect(await screen.findByText('Liste des habitudes')).toBeInTheDocument()
    expect(api.removeHabit).toHaveBeenCalledWith('h1')

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(api.insertHabit).toHaveBeenCalledWith(habit))
    await waitFor(() => expect(api.insertLogs).toHaveBeenCalledWith(history))
  })
})
