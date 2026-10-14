import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui'
import * as api from './goalsApi'
import GoalsPage from './GoalsPage'
import type { Goal, Milestone } from './types'

vi.mock('./goalsApi')

const goal: Goal = {
  id: 'g1',
  title: 'Courir un semi',
  description: null,
  horizon: 'medium',
  target_date: null,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}
const milestone = (id: string, done: boolean, position: number): Milestone => ({
  id,
  goal_id: 'g1',
  title: id,
  done,
  position,
  created_at: '2026-01-01T00:00:00Z',
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <GoalsPage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.mocked(api.fetchGoals).mockResolvedValue([goal])
    vi.mocked(api.fetchMilestones).mockResolvedValue([
      milestone('10 km', true, 0),
      milestone('15 km', false, 1),
    ])
    vi.mocked(api.patchMilestone).mockReturnValue(new Promise<void>(() => {}))
    vi.mocked(api.insertGoal).mockReturnValue(new Promise<void>(() => {}))
  })

  it('affiche la progression calculée et la met à jour en cochant un jalon', async () => {
    renderPage()
    expect(await screen.findByText('1/2 jalons · 50 %')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Moyen terme' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Courir un semi/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /15 km/ }))

    expect(await screen.findByText('2/2 jalons · 100 %')).toBeInTheDocument()
    expect(api.patchMilestone).toHaveBeenCalledWith('15 km', { done: true })
  })

  it('ajoute un objectif dans le bon horizon', async () => {
    renderPage()
    await screen.findByText('Courir un semi')
    await userEvent.selectOptions(screen.getByLabelText('Horizon'), 'long')
    await userEvent.type(screen.getByLabelText('Nouvel objectif'), 'Apprendre le piano{Enter}')

    expect(api.insertGoal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Apprendre le piano', horizon: 'long', status: 'active' }),
    )
    expect(await screen.findByRole('heading', { name: 'Long terme' })).toBeInTheDocument()
  })

  it('range un objectif atteint à part', async () => {
    vi.mocked(api.patchGoal).mockReturnValue(new Promise<void>(() => {}))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Courir un semi/ }))
    await userEvent.selectOptions(screen.getByLabelText('Statut'), 'achieved')

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Atteints ou abandonnés (1)' }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText(/Aucun objectif en cours/)).toBeInTheDocument()
  })
})
