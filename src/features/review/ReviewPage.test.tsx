import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import * as checkinsApi from '@/features/checkins/checkinsApi'
import * as budgetApi from '@/features/budget/budgetApi'
import * as goalsApi from '@/features/goals/goalsApi'
import * as habitsApi from '@/features/habits/habitsApi'
import * as todosApi from '@/features/todos/todosApi'
import { addDays, todayISO } from '@/lib/dates'
import { defaultReviewWeek } from './reviewLogic'
import ReviewPage from './ReviewPage'

vi.mock('@/features/checkins/checkinsApi')
vi.mock('@/features/todos/todosApi')
vi.mock('@/features/habits/habitsApi')
vi.mock('@/features/goals/goalsApi')
vi.mock('@/features/budget/budgetApi')

const monday = defaultReviewWeek(todayISO())

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <ReviewPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ReviewPage', () => {
  beforeEach(() => {
    vi.mocked(checkinsApi.fetchCheckins).mockResolvedValue([])
    vi.mocked(todosApi.fetchTodos).mockResolvedValue([
      {
        id: 't1',
        list_id: null,
        goal_id: null,
        title: 'Rendre le dossier',
        done: true,
        done_at: `${addDays(monday, 1)}T10:00:00Z`,
        due_date: null,
        priority: 'normal',
        recurrence: null,
        focus_on: null,
        position: 0,
        created_at: '',
      },
    ])
    vi.mocked(habitsApi.fetchHabits).mockResolvedValue([])
    vi.mocked(habitsApi.fetchLogs).mockResolvedValue([])
    vi.mocked(habitsApi.fetchDaysOff).mockResolvedValue([])
    vi.mocked(goalsApi.fetchGoals).mockResolvedValue([])
    vi.mocked(goalsApi.fetchMilestones).mockResolvedValue([])
    vi.mocked(budgetApi.fetchCategories).mockResolvedValue([])
    vi.mocked(budgetApi.fetchExpensesBetween).mockResolvedValue([
      {
        id: 'e1',
        category_id: null,
        amount_cents: 4250,
        spent_on: addDays(monday, 2),
        note: null,
        recurring_id: null,
        created_at: '',
      },
    ])
  })

  it('résume la semaine : todos terminées et dépenses', async () => {
    renderPage()
    const todos = await screen.findByRole('region', { name: 'Todos' })
    expect(await within(todos).findByText('Rendre le dossier')).toBeInTheDocument()
    expect(await screen.findByText(/1 todo terminée · 42,50/)).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Dépenses' })).getByText('Sans catégorie'),
    ).toBeInTheDocument()
  })

  it('navigue vers la semaine précédente', async () => {
    renderPage()
    await screen.findByText(/1 todo terminée/)
    await userEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }))
    expect(budgetApi.fetchExpensesBetween).toHaveBeenCalledWith(
      addDays(monday, -7),
      addDays(monday, -1),
    )
    expect(await screen.findByText(/0 todo terminée/)).toBeInTheDocument()
  })

  it('montre humeur et énergie, et les liens avec les habitudes', async () => {
    const sunday = addDays(monday, 6)
    const end = sunday < todayISO() ? sunday : todayISO()
    const days = Array.from({ length: 28 }, (_, i) => addDays(end, -i))
    vi.mocked(habitsApi.fetchHabits).mockResolvedValue([
      {
        id: 'h1',
        name: 'Course',
        target_per_week: 3,
        days: null,
        goal_amount: null,
        unit: null,
        goal_id: null,
        archived: false,
        position: 0,
        created_at: '',
      },
    ])
    vi.mocked(habitsApi.fetchLogs).mockResolvedValue(
      days
        .filter((_, i) => i % 2 === 0)
        .map((day) => ({ id: day, habit_id: 'h1', day, amount: null })),
    )
    vi.mocked(checkinsApi.fetchCheckins).mockResolvedValue(
      days.map((day, i) => ({ day, mood: 4, energy: i % 2 === 0 ? 4 : 3, win: null })),
    )
    renderPage()
    const card = await screen.findByRole('region', { name: 'Humeur et énergie' })
    expect(
      await within(card).findByText(/Humeur 4,0 \/ 5 · Énergie \d,\d \/ 5/),
    ).toBeInTheDocument()
    expect(within(card).getByText(/Les jours de « Course », énergie/)).toHaveTextContent('+1,0')
    expect(within(card).queryByText(/Course », humeur/)).toBeNull()
  })

  it('invite à noter son humeur quand la semaine est vide', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Humeur et énergie' })
    expect(within(card).getByRole('link', { name: 'Noter mon humeur' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('liste les victoires de la semaine', async () => {
    vi.mocked(checkinsApi.fetchCheckins).mockResolvedValue([
      { day: addDays(monday, 1), mood: null, energy: null, win: 'Dossier rendu' },
      { day: addDays(monday, -3), mood: null, energy: null, win: 'Semaine d’avant' },
    ])
    renderPage()
    const card = await screen.findByRole('region', { name: 'Victoires' })
    expect(await within(card).findByText('Dossier rendu')).toBeInTheDocument()
    expect(within(card).queryByText('Semaine d’avant')).toBeNull()
    expect(screen.getByText(/· 1 victoire$/)).toBeInTheDocument()
  })
})
