import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui'
import { addDays, monthOf, todayISO } from '@/lib/dates'
import * as goalsApi from '@/features/goals/goalsApi'
import * as savingsApi from '@/features/savings/savingsApi'
import * as api from './budgetApi'
import BudgetPage from './BudgetPage'
import type { Category, RecurringEntry } from './types'

vi.mock('@/features/savings/savingsApi')
vi.mock('@/features/goals/goalsApi')
vi.mock('./budgetApi')

const category = (id: string, name: string, budget: number | null, position: number): Category => ({
  id,
  name,
  color: null,
  monthly_budget_cents: budget,
  position,
  archived: false,
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <BudgetPage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('BudgetPage', () => {
  beforeEach(() => {
    vi.mocked(savingsApi.fetchSavings).mockResolvedValue([])
    vi.mocked(savingsApi.fetchMoves).mockResolvedValue([])
    vi.mocked(goalsApi.fetchGoals).mockResolvedValue([])
    vi.mocked(goalsApi.fetchMilestones).mockResolvedValue([])
    localStorage.clear()
    vi.mocked(api.fetchCategories).mockResolvedValue([
      category('c1', 'Courses', 30000, 0),
      category('c2', 'Loisirs', null, 1),
    ])
    vi.mocked(api.fetchExpenses).mockResolvedValue([])
    vi.mocked(api.fetchExpensesBetween).mockResolvedValue([])
    vi.mocked(api.fetchIncomes).mockResolvedValue([])
    vi.mocked(api.fetchRecurring).mockResolvedValue([])
    vi.mocked(api.insertExpense).mockReturnValue(new Promise<void>(() => {}))
  })

  it('comprend « 12,50 resto hier » (montant, catégorie, date)', async () => {
    vi.mocked(api.fetchCategories).mockResolvedValue([
      category('c1', 'Courses', 30000, 0),
      category('c2', 'Restaurants', null, 1),
    ])
    renderPage()
    await screen.findByRole('button', { name: 'Restaurants' })
    await userEvent.type(screen.getByLabelText('Montant en euros'), '12,50 resto hier')
    expect(screen.getByRole('button', { name: 'Restaurants', pressed: true })).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')

    expect(api.insertExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_cents: 1250,
        category_id: 'c2',
        spent_on: addDays(todayISO(), -1),
        note: null,
      }),
    )
  })

  it('ajoute un revenu avec « + » et affiche le solde', async () => {
    vi.mocked(api.insertIncome).mockReturnValue(new Promise<void>(() => {}))
    renderPage()
    await screen.findByRole('button', { name: 'Courses' })
    await userEvent.type(screen.getByLabelText('Montant en euros'), '+2400 salaire{Enter}')

    expect(api.insertIncome).toHaveBeenCalledWith(
      expect.objectContaining({ amount_cents: 240000, note: 'salaire', received_on: todayISO() }),
    )
    expect(api.insertExpense).not.toHaveBeenCalled()
    expect(await screen.findByText(/Revenus 2\s400,00/)).toBeInTheDocument()
    expect(screen.getByText('salaire')).toBeInTheDocument()
  })

  it('crée une dépense récurrente depuis le gestionnaire', async () => {
    const server: RecurringEntry[] = []
    vi.mocked(api.fetchRecurring).mockImplementation(async () => [...server])
    vi.mocked(api.insertRecurring).mockImplementation(async (rule) => {
      server.push(rule)
    })
    renderPage()
    await screen.findByRole('button', { name: 'Courses' })
    await userEvent.click(screen.getByText('Ajouter une récurrence en détail'))
    await userEvent.type(screen.getByLabelText('Montant récurrent'), '900')
    const day = screen.getByLabelText('Jour du mois')
    await userEvent.clear(day)
    await userEvent.type(day, '5')
    await userEvent.type(screen.getByLabelText('Note récurrente'), 'Loyer{Enter}')

    expect(api.insertRecurring).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'expense',
        amount_cents: 90000,
        day_of_month: 5,
        note: 'Loyer',
        active: true,
      }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Modifier la récurrence « Loyer »' }),
    )
    expect(screen.getByLabelText('Montant de « Loyer »')).toHaveValue('900,00')
  })

  it('« Répéter chaque mois » sur une dépense crée la règle sans doublon', async () => {
    const today = todayISO()
    vi.mocked(api.fetchExpenses).mockResolvedValue([
      {
        id: 'e1',
        category_id: 'c2',
        amount_cents: 1399,
        spent_on: today,
        note: 'Netflix',
        recurring_id: null,
        created_at: '',
      },
    ])
    vi.mocked(api.insertRecurring).mockResolvedValue()
    vi.mocked(api.patchExpense).mockResolvedValue()
    renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: /Modifier la dépense de 13,99/ }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Répéter chaque mois' }))

    expect(api.insertRecurring).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_cents: 1399,
        note: 'Netflix',
        start_on: today,
        last_generated_on: today,
      }),
    )
    const rule = vi.mocked(api.insertRecurring).mock.calls[0]![0]
    await waitFor(() =>
      expect(api.patchExpense).toHaveBeenCalledWith('e1', { recurring_id: rule.id }),
    )
  })

  it('supprime une catégorie puis l’annule (les dépenses y sont rattachées de nouveau)', async () => {
    let server = [category('c1', 'Courses', 30000, 0), category('c2', 'Loisirs', null, 1)]
    vi.mocked(api.fetchCategories).mockImplementation(async () => [...server])
    vi.mocked(api.fetchExpenseIdsByCategory).mockResolvedValue(['e1', 'e2'])
    vi.mocked(api.removeCategory).mockImplementation(async (id) => {
      server = server.filter((c) => c.id !== id)
    })
    vi.mocked(api.insertCategories).mockImplementation(async (added) => {
      server = [...server, ...added]
    })
    vi.mocked(api.setExpensesCategory).mockResolvedValue()
    renderPage()
    await screen.findByRole('button', { name: 'Courses' })
    await userEvent.click(screen.getByText('Catégories et budgets'))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer la catégorie Loisirs' }))

    await waitFor(() => expect(api.removeCategory).toHaveBeenCalledWith('c2'))
    expect(screen.queryByRole('button', { name: 'Loisirs' })).not.toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'Annuler' }))
    await waitFor(() =>
      expect(api.insertCategories).toHaveBeenCalledWith([category('c2', 'Loisirs', null, 1)]),
    )
    await waitFor(() => expect(api.setExpensesCategory).toHaveBeenCalledWith(['e1', 'e2'], 'c2'))
  })

  it('saisit une dépense en centimes avec une catégorie et met à jour le total', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Courses' }))
    await userEvent.type(screen.getByLabelText('Montant en euros'), '12,50{Enter}')

    expect(api.insertExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_cents: 1250,
        category_id: 'c1',
        spent_on: todayISO(),
        note: null,
      }),
    )
    expect(await screen.findByText(/Reste/)).toHaveTextContent(/287,50/)
    expect(screen.getByLabelText('Montant en euros')).toHaveValue('')
  })

  it('refuse un montant invalide', async () => {
    renderPage()
    await screen.findByRole('button', { name: 'Courses' })
    await userEvent.type(screen.getByLabelText('Montant en euros'), 'abc{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Montant invalide')
    expect(api.insertExpense).not.toHaveBeenCalled()
  })

  it('présélectionne la dernière catégorie utilisée', async () => {
    localStorage.setItem('cockpit.lastCategory', 'c2')
    renderPage()
    expect(
      await screen.findByRole('button', { name: 'Loisirs', pressed: true }),
    ).toBeInTheDocument()
  })

  it('devine la catégorie d’après l’historique, sans écraser un choix manuel', async () => {
    localStorage.setItem('cockpit.lastCategory', 'c2')
    vi.mocked(api.insertExpense).mockResolvedValue()
    const past = (note: string, category_id: string, id: string) => ({
      id,
      category_id,
      amount_cents: 4000,
      spent_on: addDays(todayISO(), -20),
      note,
      recurring_id: null,
      created_at: '',
    })
    vi.mocked(api.fetchExpensesBetween).mockResolvedValue([
      past('Biocoop', 'c1', 'p1'),
      past('Biocoop Bastille', 'c1', 'p2'),
      // « carrefour » est un mot-clé générique de Courses, mais ici c'est toujours Loisirs
      past('Carrefour', 'c2', 'p3'),
    ])
    renderPage()
    const input = screen.getByLabelText('Montant en euros')
    await screen.findByRole('button', { name: 'Loisirs', pressed: true })

    await userEvent.type(input, '45 biocoop')
    expect(
      await screen.findByRole('button', { name: 'Courses', pressed: true }),
    ).toBeInTheDocument()
    expect(screen.getByText(/d'après l'historique/)).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(api.insertExpense).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount_cents: 4500, category_id: 'c1', note: 'biocoop' }),
    )

    await userEvent.type(input, '30 carrefour')
    expect(screen.getByRole('button', { name: 'Loisirs', pressed: true })).toBeInTheDocument()
    await userEvent.clear(input)

    // un clic sur une puce l'emporte sur l'historique
    await userEvent.type(input, '12 biocoop')
    await userEvent.click(screen.getByRole('button', { name: 'Loisirs' }))
    expect(screen.queryByText(/d'après l'historique/)).toBeNull()
    await userEvent.click(screen.getAllByRole('button', { name: 'Ajouter' })[0]!)
    await waitFor(() =>
      expect(api.insertExpense).toHaveBeenLastCalledWith(
        expect.objectContaining({ amount_cents: 1200, category_id: 'c2' }),
      ),
    )
  })

  it('navigue entre les mois', async () => {
    renderPage()
    await screen.findByRole('button', { name: 'Courses' })
    await userEvent.click(screen.getByRole('button', { name: 'Mois précédent' }))

    const previous = (() => {
      const [y, m] = monthOf(todayISO()).split('-').map(Number) as [number, number]
      return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
    })()
    expect(api.fetchExpenses).toHaveBeenCalledWith(previous)
    expect(await screen.findByRole('button', { name: 'Ce mois-ci' })).toBeInTheDocument()
  })

  it('« ↻ Chaque mois » : crée la règle puis la dépense du jour qui y est rattachée', async () => {
    const order: string[] = []
    vi.mocked(api.insertRecurring).mockImplementation(async () => {
      order.push('règle')
    })
    vi.mocked(api.insertExpense).mockImplementation(async () => {
      order.push('dépense')
    })
    renderPage()
    await screen.findByRole('button', { name: 'Courses' })
    await userEvent.type(screen.getByLabelText('Montant en euros'), '900 loyer')
    await userEvent.click(screen.getByRole('button', { name: '↻ Chaque mois' }))
    expect(screen.getByText(/↻ Chaque mois, le/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Ajouter' })[0]!)

    const today = todayISO()
    await waitFor(() => expect(order).toEqual(['règle', 'dépense']))
    const rule = vi.mocked(api.insertRecurring).mock.calls[0]![0]
    expect(rule).toMatchObject({
      kind: 'expense',
      amount_cents: 90000,
      note: 'loyer',
      day_of_month: Number(today.slice(8)),
      start_on: today,
      last_generated_on: today,
    })
    expect(api.insertExpense).toHaveBeenCalledWith(
      expect.objectContaining({ recurring_id: rule.id, spent_on: today }),
    )
    expect(await screen.findByText(/Ajoutée chaque mois/)).toBeInTheDocument()
  })

  const tomorrowDay = Number(todayISO().slice(8)) + 1
  it.skipIf(tomorrowDay > 28)(
    '« le N tous les mois » avec un jour à venir : la règle seule, rien à compter aujourd’hui',
    async () => {
      vi.mocked(api.insertRecurring).mockResolvedValue()
      renderPage()
      await screen.findByRole('button', { name: 'Courses' })
      await userEvent.type(
        screen.getByLabelText('Montant en euros'),
        `13,99 netflix le ${tomorrowDay} tous les mois{Enter}`,
      )

      await waitFor(() => expect(api.insertRecurring).toHaveBeenCalled())
      expect(vi.mocked(api.insertRecurring).mock.calls[0]![0]).toMatchObject({
        day_of_month: tomorrowDay,
        start_on: `${monthOf(todayISO())}-${String(tomorrowDay).padStart(2, '0')}`,
        last_generated_on: null,
      })
      expect(api.insertExpense).not.toHaveBeenCalled()
    },
  )

  it('déduit l’épargne du mois du solde', async () => {
    const today = todayISO()
    vi.mocked(api.fetchIncomes).mockResolvedValue([
      {
        id: 'i1',
        amount_cents: 200000,
        received_on: today,
        note: 'Salaire',
        recurring_id: null,
        created_at: '',
      },
    ])
    vi.mocked(savingsApi.fetchSavings).mockResolvedValue([
      {
        id: 's1',
        name: 'Vacances',
        target_cents: 100000,
        goal_id: null,
        archived: false,
        position: 0,
        created_at: '',
      },
    ])
    vi.mocked(savingsApi.fetchMoves).mockResolvedValue([
      {
        id: 'm1',
        savings_id: 's1',
        amount_cents: 60000,
        moved_on: today,
        note: null,
        created_at: '',
      },
    ])
    renderPage()
    const summary = await screen.findByRole('region', { name: 'Synthèse du mois' })
    await waitFor(() => expect(summary).toHaveTextContent(/Épargne 600,00\s€/))
    expect(summary).toHaveTextContent(/Solde \+1\s400,00\s€/)
  })

  it('explique un échec dû à une migration manquante (PGRST204) et annule la dépense', async () => {
    vi.mocked(api.insertExpense).mockRejectedValue({
      code: 'PGRST204',
      message: "Could not find the 'recurring_id' column of 'expenses' in the schema cache",
    })
    renderPage()
    await screen.findByRole('button', { name: 'Courses' })
    await userEvent.type(screen.getByLabelText('Montant en euros'), '12,50{Enter}')
    expect(
      await screen.findByText(/Enregistrement impossible : la base n'est pas à jour/),
    ).toBeInTheDocument()
    // la mise à jour optimiste est retirée
    await waitFor(() => expect(screen.queryByText('12,50 €')).toBeNull())
  })
})
