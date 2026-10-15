import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pickOption } from '@/test/pickOption'
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
    vi.mocked(api.fetchDaysOff).mockResolvedValue([])
    vi.mocked(api.insertLogs).mockReturnValue(new Promise<void>(() => {}))
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
    expect(api.insertLogs).toHaveBeenCalledWith([
      expect.objectContaining({ habit_id: 'h1', amount: null, day: todayISO() }),
    ])
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

  it('lit un objectif chiffré dans le nom et des jours précis', async () => {
    renderPage()
    await screen.findByText('Lecture')
    await pickOption('Fréquence', 'Certains jours')
    await userEvent.click(screen.getByRole('button', { name: 'vendredi' })) // lun, mer, ven → lun, mer
    await userEvent.type(screen.getByLabelText('Nouvelle habitude'), "Boire 8 verres d'eau")
    expect(screen.getByText(/Objectif chiffré : 8 verres/)).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')

    expect(api.insertHabit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Boire 8 verres d'eau",
        goal_amount: 8,
        unit: 'verres',
        days: [1, 3],
        target_per_week: 2,
      }),
    )
  })

  it('remplit l’objectif d’une habitude chiffrée en un clic', async () => {
    vi.mocked(api.fetchHabits).mockResolvedValue([{ ...habit, goal_amount: 8, unit: 'verres' }])
    renderPage()
    await screen.findByText('Lecture')
    const todayCell = screen.getAllByRole('button', { pressed: false }).at(-1)!
    await userEvent.click(todayCell)
    expect(api.insertLogs).toHaveBeenCalledWith([
      expect.objectContaining({ amount: 8, day: todayISO() }),
    ])
  })

  it('marque aujourd’hui comme jour off', async () => {
    vi.mocked(api.insertDaysOff).mockReturnValue(new Promise<void>(() => {}))
    renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: "Marquer aujourd'hui comme jour off" }),
    )
    expect(api.insertDaysOff).toHaveBeenCalledWith([expect.objectContaining({ day: todayISO() })])
    expect(
      screen.getByRole('button', { name: "Aujourd'hui : jour off", pressed: true }),
    ).toBeInTheDocument()
  })
})
