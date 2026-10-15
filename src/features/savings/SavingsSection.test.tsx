import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pickOption } from '@/test/pickOption'
import { ToastProvider } from '@/components/ui'
import * as goalsApi from '@/features/goals/goalsApi'
import { monthOf, todayISO } from '@/lib/dates'
import * as api from './savingsApi'
import { SavingsSection } from './SavingsSection'
import type { SavingsGoal, SavingsMove } from './types'

vi.mock('./savingsApi')
vi.mock('@/features/goals/goalsApi')

const vacances: SavingsGoal = {
  id: 's1',
  name: 'Vacances',
  target_cents: 100000,
  goal_id: null,
  archived: false,
  position: 0,
  created_at: '2026-01-01T00:00:00Z',
}
const today = todayISO()

let goals: SavingsGoal[] = []
let moves: SavingsMove[] = []

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <SavingsSection month={monthOf(today)} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('SavingsSection', () => {
  beforeEach(() => {
    goals = [vacances]
    moves = [
      {
        id: 'm1',
        savings_id: 's1',
        amount_cents: 60000,
        moved_on: today,
        note: null,
        created_at: `${today}T08:00:00Z`,
      },
    ]
    vi.mocked(api.fetchSavings).mockImplementation(async () => goals.map((g) => ({ ...g })))
    vi.mocked(api.fetchMoves).mockImplementation(async () => moves.map((m) => ({ ...m })))
    vi.mocked(api.insertSavings).mockImplementation(async (g) => {
      goals = [...goals, g]
    })
    vi.mocked(api.patchSavings).mockImplementation(async (id, patch) => {
      goals = goals.map((g) => (g.id === id ? { ...g, ...patch } : g))
    })
    vi.mocked(api.removeSavings).mockImplementation(async (id) => {
      goals = goals.filter((g) => g.id !== id)
      moves = moves.filter((m) => m.savings_id !== id)
    })
    vi.mocked(api.insertMoves).mockImplementation(async (added) => {
      moves = [...moves, ...added]
    })
    vi.mocked(api.patchMove).mockImplementation(async (id, patch) => {
      moves = moves.map((m) => (m.id === id ? { ...m, ...patch } : m))
    })
    vi.mocked(api.removeMove).mockImplementation(async (id) => {
      moves = moves.filter((m) => m.id !== id)
    })
    vi.mocked(goalsApi.fetchGoals).mockResolvedValue([
      {
        id: 'g1',
        title: 'Voyage au Japon',
        description: null,
        horizon: 'long',
        target_date: null,
        status: 'active',
        created_at: '',
        updated_at: '',
      },
    ])
    vi.mocked(goalsApi.fetchMilestones).mockResolvedValue([])
  })

  it('montre le solde, la cible et l’épargne du mois', async () => {
    renderSection()
    const bar = await screen.findByRole('progressbar', { name: 'Cagnotte « Vacances »' })
    expect(bar).toHaveAttribute('aria-valuenow', '60')
    expect(screen.getByText(/Ce mois-ci : \+600,00/)).toBeInTheDocument()
  })

  it('verse en un geste (Entrée), puis annule le versement', async () => {
    renderSection()
    const input = await screen.findByLabelText('Montant pour « Vacances »')
    await userEvent.type(input, '150{Enter}')
    expect(api.insertMoves).toHaveBeenCalledWith([
      expect.objectContaining({ savings_id: 's1', amount_cents: 15000, moved_on: today }),
    ])
    expect(await screen.findByText(/150,00 € versés dans « Vacances »/)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('progressbar', { name: 'Cagnotte « Vacances »' })).toHaveAttribute(
        'aria-valuenow',
        '75',
      ),
    )
    const created = vi.mocked(api.insertMoves).mock.calls[0]![0][0]!
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(api.removeMove).toHaveBeenCalledWith(created.id))
  })

  it('refuse un retrait supérieur au solde, accepte un retrait possible', async () => {
    renderSection()
    const input = await screen.findByLabelText('Montant pour « Vacances »')
    await userEvent.type(input, '700')
    await userEvent.click(screen.getByRole('button', { name: 'Retirer' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Solde de 600,00')
    expect(api.insertMoves).not.toHaveBeenCalled()

    await userEvent.clear(input)
    await userEvent.type(input, '100')
    await userEvent.click(screen.getByRole('button', { name: 'Retirer' }))
    expect(api.insertMoves).toHaveBeenCalledWith([
      expect.objectContaining({ amount_cents: -10000 }),
    ])
  })

  it('crée une cagnotte avec un montant cible', async () => {
    renderSection()
    await userEvent.type(await screen.findByLabelText('Nom de la nouvelle cagnotte'), 'Coussin')
    await userEvent.type(
      screen.getByLabelText('Montant cible de la nouvelle cagnotte'),
      '3 000{Enter}',
    )
    await waitFor(() =>
      expect(api.insertSavings).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Coussin', target_cents: 300000, goal_id: null }),
      ),
    )
    expect(await screen.findByText('Coussin')).toBeInTheDocument()
  })

  it('modifie la cible, lie un objectif, édite puis supprime un mouvement', async () => {
    renderSection()
    await userEvent.click(await screen.findByRole('button', { name: /^Vacances/ }))

    const target = screen.getByLabelText('Montant cible')
    await userEvent.clear(target)
    await userEvent.type(target, '2000')
    await userEvent.tab()
    expect(api.patchSavings).toHaveBeenCalledWith('s1', { target_cents: 200000 })

    await pickOption('Objectif lié', '◎ Voyage au Japon')
    await waitFor(() => expect(api.patchSavings).toHaveBeenCalledWith('s1', { goal_id: 'g1' }))
    expect(await screen.findByText('◎ Pour « Voyage au Japon »')).toBeInTheDocument()

    const history = screen.getByRole('region', { name: 'Historique de « Vacances »' })
    await userEvent.click(within(history).getByRole('button', { name: /Modifier le versement/ }))
    const amount = screen.getByLabelText('Montant du mouvement')
    await userEvent.clear(amount)
    await userEvent.type(amount, '650')
    await userEvent.tab()
    await waitFor(() => expect(api.patchMove).toHaveBeenCalledWith('m1', { amount_cents: 65000 }))

    await userEvent.click(within(history).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(api.removeMove).toHaveBeenCalledWith('m1'))
    expect(await screen.findByText('Mouvement supprimé')).toBeInTheDocument()
  })

  it('supprime une cagnotte avec son historique, et l’annulation remet tout', async () => {
    renderSection()
    await userEvent.click(await screen.findByRole('button', { name: /^Vacances/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer la cagnotte' }))
    expect(api.removeSavings).toHaveBeenCalledWith('s1')
    await waitFor(() =>
      expect(screen.queryByRole('progressbar', { name: 'Cagnotte « Vacances »' })).toBeNull(),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(api.insertSavings).toHaveBeenCalledWith(vacances))
    await waitFor(() =>
      expect(api.insertMoves).toHaveBeenCalledWith([expect.objectContaining({ id: 'm1' })]),
    )
    expect(
      await screen.findByRole('progressbar', { name: 'Cagnotte « Vacances »' }),
    ).toHaveAttribute('aria-valuenow', '60')
  })
})
