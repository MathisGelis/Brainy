import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import * as budgetApi from '@/features/budget/budgetApi'
import * as checkinsApi from '@/features/checkins/checkinsApi'
import * as goalsApi from '@/features/goals/goalsApi'
import * as habitsApi from '@/features/habits/habitsApi'
import * as todosApi from '@/features/todos/todosApi'
import type { Todo } from '@/features/todos/types'
import { addDays, addMonths, formatLongDay, formatMonthLabel, monthOf, todayISO } from '@/lib/dates'
import CalendarPage from './CalendarPage'

vi.mock('@/features/todos/todosApi')
vi.mock('@/features/habits/habitsApi')
vi.mock('@/features/goals/goalsApi')
vi.mock('@/features/budget/budgetApi')
vi.mock('@/features/checkins/checkinsApi')

const today = todayISO()
const yesterday = addDays(today, -1)
const tomorrow = addDays(today, 1)
const facture: Todo = {
  id: 't1',
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  focus_week: null,
  title: 'Payer la facture',
  done: false,
  done_at: null,
  due_date: tomorrow,
  priority: 'normal',
  position: 0,
  created_at: '',
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

const cell = (day: string) =>
  screen.getByRole('button', { name: new RegExp(`^${formatLongDay(day)}`) })

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.mocked(todosApi.fetchTodos).mockResolvedValue([facture])
    vi.mocked(todosApi.fetchLists).mockResolvedValue([])
    vi.mocked(todosApi.insertTodo).mockResolvedValue()
    vi.mocked(todosApi.patchTodo).mockResolvedValue()
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
    ])
    vi.mocked(habitsApi.fetchLogs).mockResolvedValue([])
    vi.mocked(habitsApi.fetchDaysOff).mockResolvedValue([])
    vi.mocked(habitsApi.insertLogs).mockReturnValue(new Promise<void>(() => {}))
    vi.mocked(goalsApi.fetchGoals).mockResolvedValue([])
    vi.mocked(goalsApi.fetchMilestones).mockResolvedValue([])
    vi.mocked(budgetApi.fetchCategories).mockResolvedValue([])
    vi.mocked(budgetApi.fetchExpenses).mockResolvedValue([])
    vi.mocked(budgetApi.fetchExpensesBetween).mockResolvedValue([
      {
        id: 'e1',
        category_id: null,
        amount_cents: 4200,
        spent_on: yesterday,
        note: 'Courses',
        recurring_id: null,
        created_at: '',
      },
    ])
    vi.mocked(checkinsApi.fetchCheckins).mockResolvedValue([
      { day: yesterday, mood: 4, energy: 3, win: null },
    ])
  })

  it('ouvre sur aujourd’hui et résume chaque jour pour les lecteurs d’écran', async () => {
    renderPage()
    expect(screen.getByRole('heading', { name: formatMonthLabel(monthOf(today)) })).toBeVisible()
    expect(cell(today)).toHaveAttribute('aria-current', 'date')
    expect(cell(today)).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() =>
      expect(cell(tomorrow)).toHaveAccessibleName(`${formatLongDay(tomorrow)} : 1 todo à faire`),
    )
    await waitFor(() => expect(cell(yesterday).getAttribute('aria-label')).toMatch(/42,00/))
    expect(cell(yesterday).getAttribute('aria-label')).toMatch(/humeur 4 sur 5/)
  })

  it('le détail d’un jour est actionnable : cocher, ajouter une todo à cette date', async () => {
    renderPage()
    await userEvent.click(cell(tomorrow))
    const detail = screen.getByRole('region', { name: new RegExp(`^${formatLongDay(tomorrow)}`) })
    expect(detail).toHaveAccessibleName(/· Demain$/)
    expect(within(detail).getByText('Les habitudes se cochent le jour venu.')).toBeInTheDocument()

    await userEvent.click(
      await within(detail).findByRole('checkbox', { name: 'Terminer « Payer la facture »' }),
    )
    expect(todosApi.patchTodo).toHaveBeenCalledWith('t1', expect.objectContaining({ done: true }))

    await userEvent.type(
      within(detail).getByLabelText(`Nouvelle todo pour le ${formatLongDay(tomorrow)}`),
      'Appeler le notaire{Enter}',
    )
    await waitFor(() =>
      expect(todosApi.insertTodo).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Appeler le notaire', due_date: tomorrow }),
      ),
    )
  })

  it('coche une habitude et note l’humeur d’un jour passé', async () => {
    vi.mocked(checkinsApi.upsertCheckin).mockReturnValue(new Promise<void>(() => {}))
    renderPage()
    await userEvent.click(cell(yesterday))
    const detail = screen.getByRole('region', { name: new RegExp(`^${formatLongDay(yesterday)}`) })
    expect(within(detail).getByRole('region', { name: /^Dépenses/ })).toHaveTextContent(
      /Courses.*42,00/,
    )

    const label = new RegExp(`^Lecture fait le `)
    await userEvent.click(await within(detail).findByRole('checkbox', { name: label }))
    expect(habitsApi.insertLogs).toHaveBeenCalledWith([
      expect.objectContaining({ habit_id: 'h1', day: yesterday }),
    ])

    await userEvent.click(
      await within(detail).findByRole('button', { name: 'Énergie : au top (5 sur 5)' }),
    )
    expect(checkinsApi.upsertCheckin).toHaveBeenCalledWith({
      day: yesterday,
      mood: 4,
      energy: 5,
      win: null,
    })
  })

  it('se déplace au clavier et change de mois', async () => {
    renderPage()
    cell(today).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(cell(tomorrow)).toHaveFocus()
    expect(cell(tomorrow)).toHaveAttribute('aria-pressed', 'true')

    const next = addMonths(monthOf(today), 1)
    await userEvent.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.getByRole('heading', { name: formatMonthLabel(next) })).toBeVisible()
    expect(cell(`${next}-01`)).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }))
    expect(cell(today)).toHaveAttribute('aria-pressed', 'true')
  })
})
