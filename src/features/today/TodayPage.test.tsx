import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import * as budgetApi from '@/features/budget/budgetApi'
import * as habitsApi from '@/features/habits/habitsApi'
import * as notesApi from '@/features/notes/notesApi'
import * as goalsApi from '@/features/goals/goalsApi'
import * as todosApi from '@/features/todos/todosApi'
import { addDays, todayISO } from '@/lib/dates'
import TodayPage from './TodayPage'

vi.mock('@/features/todos/todosApi')
vi.mock('@/features/habits/habitsApi')
vi.mock('@/features/budget/budgetApi')
vi.mock('@/features/notes/notesApi')
vi.mock('@/features/goals/goalsApi')
vi.mock('@/features/auth/useAuth', () => ({ signOut: vi.fn() }))

const today = todayISO()
const baseTodo = {
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  done: false,
  done_at: null,
  priority: 'normal' as const,
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <TodayPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('TodayPage', () => {
  beforeEach(() => {
    vi.mocked(todosApi.fetchTodos).mockResolvedValue([
      { ...baseTodo, id: 't1', title: 'Payer le loyer', due_date: today },
      { ...baseTodo, id: 't2', title: 'Plus tard', due_date: addDays(today, 3) },
      { ...baseTodo, id: 't3', title: 'En retard', due_date: addDays(today, -2) },
    ])
    vi.mocked(todosApi.patchTodo).mockReturnValue(new Promise<void>(() => {}))
    vi.mocked(habitsApi.fetchHabits).mockResolvedValue([
      {
        id: 'h1',
        name: 'Lecture',
        target_per_week: 7,
        days: null,
        goal_amount: null,
        unit: null,
        goal_id: null,
        archived: false,
        position: 0,
        created_at: '',
      },
      {
        id: 'h2',
        name: 'Ancienne',
        target_per_week: 7,
        days: null,
        goal_amount: null,
        unit: null,
        goal_id: null,
        archived: true,
        position: 1,
        created_at: '',
      },
    ])
    vi.mocked(habitsApi.fetchLogs).mockResolvedValue([])
    vi.mocked(notesApi.fetchNotes).mockResolvedValue([])
    vi.mocked(goalsApi.fetchGoals).mockResolvedValue([
      {
        id: 'g1',
        title: 'Courir un semi',
        description: null,
        horizon: 'medium',
        target_date: null,
        status: 'active',
        created_at: '',
        updated_at: '',
      },
    ])
    vi.mocked(goalsApi.fetchMilestones).mockResolvedValue([
      {
        id: 'm1',
        goal_id: 'g1',
        title: '10 km',
        done: true,
        done_at: null,
        position: 0,
        created_at: '',
      },
      {
        id: 'm2',
        goal_id: 'g1',
        title: '15 km',
        done: false,
        done_at: null,
        position: 1,
        created_at: '',
      },
    ])
    vi.mocked(habitsApi.fetchDaysOff).mockResolvedValue([])
    vi.mocked(habitsApi.insertLogs).mockReturnValue(new Promise<void>(() => {}))
    vi.mocked(budgetApi.fetchCategories).mockResolvedValue([
      {
        id: 'c1',
        name: 'Courses',
        color: null,
        monthly_budget_cents: 40000,
        position: 0,
        archived: false,
      },
    ])
    vi.mocked(budgetApi.fetchRecurring).mockResolvedValue([])
    vi.mocked(budgetApi.fetchExpenses).mockResolvedValue([
      {
        id: 'e1',
        category_id: 'c1',
        amount_cents: 10000,
        spent_on: today,
        note: null,
        recurring_id: null,
        created_at: '',
      },
    ])
  })

  it('montre les todos du jour (et en retard), pas celles à venir', async () => {
    renderPage()
    const section = await screen.findByRole('region', { name: 'Todos du jour' })
    expect(await within(section).findByText('Payer le loyer')).toBeInTheDocument()
    expect(within(section).getByText('En retard')).toBeInTheDocument()
    expect(within(section).queryByText('Plus tard')).not.toBeInTheDocument()
  })

  it('coche une habitude du jour en un clic', async () => {
    renderPage()
    const box = await screen.findByRole('checkbox', { name: "Lecture fait aujourd'hui" })
    expect(screen.queryByText('Ancienne')).not.toBeInTheDocument()
    await userEvent.click(box)
    await waitFor(() => expect(box).toBeChecked())
    expect(habitsApi.insertLogs).toHaveBeenCalledWith([
      expect.objectContaining({ habit_id: 'h1', amount: null, day: today }),
    ])
  })

  it('résume le budget du mois', async () => {
    renderPage()
    const section = await screen.findByRole('region', { name: 'Budget du mois' })
    expect(await within(section).findByText(/Reste/)).toHaveTextContent(/300,00/)
    expect(within(section).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
  })

  it('incrémente une habitude chiffrée avec le compteur', async () => {
    vi.mocked(habitsApi.fetchHabits).mockResolvedValue([
      {
        id: 'h3',
        name: 'Eau',
        target_per_week: 7,
        days: null,
        goal_amount: 8,
        unit: 'verres',
        goal_id: null,
        archived: false,
        position: 0,
        created_at: '',
      },
    ])
    let server: { id: string; habit_id: string; day: string; amount: number | null }[] = []
    vi.mocked(habitsApi.fetchLogs).mockImplementation(async () => [...server])
    vi.mocked(habitsApi.insertLogs).mockImplementation(async (logs) => {
      server = [...server, ...logs]
    })
    vi.mocked(habitsApi.updateLogAmount).mockImplementation(async (habitId, day, amount) => {
      server = server.map((l) => (l.habit_id === habitId && l.day === day ? { ...l, amount } : l))
    })
    renderPage()
    const plus = await screen.findByRole('button', { name: 'Ajouter 1 verres à « Eau »' })
    await userEvent.click(plus)
    await waitFor(() => expect(screen.getByText('1/8')).toBeInTheDocument())
    expect(habitsApi.insertLogs).toHaveBeenCalledWith([
      expect.objectContaining({ habit_id: 'h3', amount: 1 }),
    ])
    await userEvent.click(plus)
    await waitFor(() => expect(habitsApi.updateLogAmount).toHaveBeenCalledWith('h3', today, 2))
  })

  it('crée la note du jour, puis la retrouve au lieu d’en créer une autre', async () => {
    vi.mocked(notesApi.insertNote).mockReturnValue(new Promise<void>(() => {}))
    renderPage()
    const button = await screen.findByRole('button', { name: 'Note du jour' })
    await waitFor(() => expect(button).toBeEnabled())
    await userEvent.click(button)
    expect(notesApi.insertNote).toHaveBeenCalledTimes(1)
    expect(notesApi.insertNote).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/^Journal — /), tags: ['journal'] }),
    )
    await userEvent.click(button)
    expect(notesApi.insertNote).toHaveBeenCalledTimes(1)
  })

  it('montre le prochain jalon et le coche en datant sa réalisation', async () => {
    vi.mocked(goalsApi.patchMilestone).mockReturnValue(new Promise<void>(() => {}))
    renderPage()
    const box = await screen.findByRole('checkbox', {
      name: 'Jalon « 15 km » de « Courir un semi » fait',
    })
    expect(screen.getByText('50 %')).toBeInTheDocument()
    await userEvent.click(box)
    expect(goalsApi.patchMilestone).toHaveBeenCalledWith('m2', {
      done: true,
      done_at: expect.any(String),
    })
  })
})
