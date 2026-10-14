import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import { todayISO } from '@/lib/dates'
import * as api from './habitsApi'
import HabitsPage from './HabitsPage'

vi.mock('./habitsApi')

const habit = {
  id: 'h1',
  name: 'Lecture',
  target_per_week: 7,
  archived: false,
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <HabitsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('HabitsPage', () => {
  beforeEach(() => {
    vi.mocked(api.fetchHabits).mockResolvedValue([habit])
    vi.mocked(api.fetchLogs).mockResolvedValue([])
    vi.mocked(api.insertLog).mockReturnValue(new Promise<void>(() => {}))
    vi.mocked(api.deleteLog).mockReturnValue(new Promise<void>(() => {}))
    vi.mocked(api.insertHabit).mockReturnValue(new Promise<void>(() => {}))
  })

  it("coche aujourd'hui en un clic et met à jour la série", async () => {
    renderPage()
    await screen.findByText('Lecture')
    expect(screen.getByText(/Série : 0 jour/)).toBeInTheDocument()

    const todayCell = screen.getAllByRole('button', { pressed: false }).at(-1)!
    await userEvent.click(todayCell)

    await waitFor(() => expect(screen.getByText(/Série : 1 jour/)).toBeInTheDocument())
    expect(api.insertLog).toHaveBeenCalledWith(
      expect.objectContaining({ habit_id: 'h1', day: todayISO() }),
    )
  })

  it('ajoute une habitude', async () => {
    renderPage()
    await screen.findByText('Lecture')
    await userEvent.type(screen.getByLabelText('Nouvelle habitude'), 'Sport{Enter}')
    expect(api.insertHabit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sport', target_per_week: 7 }),
    )
    expect(await screen.findByText('Sport')).toBeInTheDocument()
  })

  it('affiche un état vide utile', async () => {
    vi.mocked(api.fetchHabits).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/Aucune habitude\. Tapez un nom/)).toBeInTheDocument()
  })
})
