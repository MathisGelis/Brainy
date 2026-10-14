import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui'
import { monthOf, todayISO } from '@/lib/dates'
import * as api from './budgetApi'
import BudgetPage from './BudgetPage'
import type { Category } from './types'

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
    localStorage.clear()
    vi.mocked(api.fetchCategories).mockResolvedValue([
      category('c1', 'Courses', 30000, 0),
      category('c2', 'Loisirs', null, 1),
    ])
    vi.mocked(api.fetchExpenses).mockResolvedValue([])
    vi.mocked(api.insertExpense).mockReturnValue(new Promise<void>(() => {}))
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
})
