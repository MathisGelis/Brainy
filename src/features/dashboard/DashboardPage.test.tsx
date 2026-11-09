import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import * as checkinsApi from '@/features/checkins/checkinsApi'
import * as menuApi from '@/features/menu/menuApi'
import * as budgetApi from '@/features/budget/budgetApi'
import * as habitsApi from '@/features/habits/habitsApi'
import * as notesApi from '@/features/notes/notesApi'
import * as goalsApi from '@/features/goals/goalsApi'
import * as todosApi from '@/features/todos/todosApi'
import * as savingsApi from '@/features/savings/savingsApi'
import { addDays, formatLongDay, todayISO } from '@/lib/dates'
import DashboardPage from './DashboardPage'

vi.mock('@/features/menu/menuApi')
vi.mock('@/features/checkins/checkinsApi')
vi.mock('@/features/todos/todosApi')
vi.mock('@/features/habits/habitsApi')
vi.mock('@/features/budget/budgetApi')
vi.mock('@/features/notes/notesApi')
vi.mock('@/features/goals/goalsApi')
vi.mock('@/features/savings/savingsApi')
vi.mock('@/features/auth/useAuth', () => ({ signOut: vi.fn() }))

const today = todayISO()
const baseTodo = {
  list_id: null,
  goal_id: null,
  recurrence: null,
  focus_on: null,
  focus_week: null,
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
          <DashboardPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(savingsApi.fetchSavings).mockResolvedValue([])
    vi.mocked(savingsApi.fetchMoves).mockResolvedValue([])
    vi.mocked(checkinsApi.fetchCheckins).mockResolvedValue([])
    vi.mocked(menuApi.fetchMealItems).mockResolvedValue([])
    vi.mocked(menuApi.fetchTargets).mockResolvedValue(null)
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

  it('courbe d’humeur : lisible jour par jour au clavier', async () => {
    vi.mocked(checkinsApi.fetchCheckins).mockResolvedValue([
      { day: addDays(today, -1), mood: 3, energy: 2, win: null },
      { day: today, mood: 4, energy: 3, win: null },
    ])
    renderPage()
    const slider = await screen.findByRole('slider', { name: /^Jour lu/ })
    expect(slider).toHaveAttribute(
      'aria-valuetext',
      `${formatLongDay(today)} : humeur 4, énergie 3`,
    )
    fireEvent.focus(slider)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(slider).toHaveAttribute(
      'aria-valuetext',
      `${formatLongDay(addDays(today, -1))} : humeur 3, énergie 2`,
    )
  })

  it('chiffres clés : todos de la semaine, habitudes, budget, humeur', async () => {
    renderPage()
    const kpis = await screen.findByRole('region', { name: 'Chiffres clés' })
    expect(within(kpis).getByText('Todos faites, 7 jours')).toBeInTheDocument()
    expect(await within(kpis).findByText('Reste à dépenser')).toBeInTheDocument()
    expect(within(kpis).getByText('Humeur, 7 derniers jours')).toBeInTheDocument()
    // lien vers la page du jour, avec ce qu'il reste à faire
    expect(screen.getByRole('link', { name: /Ma journée/ })).toHaveAttribute('href', '/aujourdhui')
  })

  it('graphiques lisibles sans souris : colonnes au clavier et vue tableau', async () => {
    renderPage()
    const week = await screen.findByRole('region', { name: 'Todos terminées, 7 jours' })
    expect(within(week).getByRole('group', { name: /^Par jour : / })).toBeInTheDocument()
    expect(within(week).getAllByRole('img')).toHaveLength(7)
    const todayColumn = within(week).getByLabelText(new RegExp(`^${formatLongDay(today)} : `))
    fireEvent.focus(todayColumn)
    expect(within(week).getByRole('status')).toHaveTextContent(formatLongDay(today))
    await userEvent.click(within(week).getByText('Voir les données'))
    expect(within(week).getByRole('table')).toBeInTheDocument()
  })

  it('résume le budget du mois', async () => {
    renderPage()
    const section = await screen.findByRole('region', { name: /^Budget de / })
    expect(await within(section).findByText(/Reste/)).toHaveTextContent(/300,00/)
    expect(within(section).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
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
  it('montre les kcal restantes et le prochain repas prévu, menant au Menu', async () => {
    const meal = (id: string, mealId: 'lunch' | 'dinner', name: string, kcal: number) => ({
      id,
      day: today,
      meal: mealId,
      food_id: null,
      recipe_id: null,
      name,
      grams: 100,
      kcal,
      protein_dg: 0,
      carbs_dg: 0,
      fat_dg: 0,
      plan_id: null,
      eaten: mealId === 'lunch',
      position: 0,
      created_at: '',
    })
    vi.mocked(menuApi.fetchMealItems).mockResolvedValue([
      meal('m1', 'lunch', 'Riz blanc (cuit)', 260),
      meal('m2', 'dinner', 'Saumon', 280),
    ])
    vi.mocked(menuApi.fetchTargets).mockResolvedValue({
      kcal: 2000,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
    })
    renderPage()
    const card = await screen.findByRole('link', { name: /kcal restantes/ })
    // seul le déjeuner (260 kcal) est coché mangé ; le dîner reste à manger
    expect(card).toHaveAccessibleName(/^1\s740 kcal restantes\. Dîner prévu : Saumon/)
    expect(card).toHaveAttribute('href', '/menu')
  })
  it('n’affiche rien du Menu sans repas ni objectif', async () => {
    renderPage()
    await screen.findByRole('region', { name: 'Prochains jalons' })
    expect(screen.queryByRole('link', { name: /kcal/ })).toBeNull()
  })
})
