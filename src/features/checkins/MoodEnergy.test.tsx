import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui'
import * as api from './checkinsApi'
import { MoodEnergy } from './MoodEnergy'
import type { DayCheckin } from './types'

vi.mock('./checkinsApi')

const DAY = '2026-10-14'
let server: DayCheckin[] = []

function renderScale() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MoodEnergy day={DAY} onError={() => {}} title="Comment ça va ?" />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('MoodEnergy', () => {
  beforeEach(() => {
    server = []
    vi.mocked(api.fetchCheckins).mockImplementation(async () => server.map((c) => ({ ...c })))
    vi.mocked(api.upsertCheckin).mockImplementation(async (c) => {
      server = [...server.filter((x) => x.day !== c.day), c]
    })
    vi.mocked(api.removeCheckin).mockImplementation(async (day) => {
      server = server.filter((x) => x.day !== day)
    })
  })

  it('note humeur et énergie en un geste chacune', async () => {
    renderScale()
    const mood = await screen.findByRole('button', { name: 'Humeur : bonne (4 sur 5)' })
    await userEvent.click(mood)
    expect(mood).toHaveAttribute('aria-pressed', 'true')
    expect(api.upsertCheckin).toHaveBeenCalledWith({ day: DAY, mood: 4, energy: null })

    await userEvent.click(screen.getByRole('button', { name: 'Énergie : au top (5 sur 5)' }))
    await waitFor(() =>
      expect(api.upsertCheckin).toHaveBeenLastCalledWith({ day: DAY, mood: 4, energy: 5 }),
    )
  })

  it('retoucher la valeur choisie la retire ; une saisie vide est supprimée', async () => {
    server = [{ day: DAY, mood: 2, energy: null }]
    renderScale()
    const mood = await screen.findByRole('button', { name: 'Humeur : bof (2 sur 5)' })
    await waitFor(() => expect(mood).toHaveAttribute('aria-pressed', 'true'))
    await userEvent.click(mood)
    expect(mood).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(api.removeCheckin).toHaveBeenCalledWith(DAY))
  })

  it('« Effacer » retire la saisie du jour, et « Annuler » la remet', async () => {
    server = [{ day: DAY, mood: 5, energy: 3 }]
    renderScale()
    await userEvent.click(await screen.findByRole('button', { name: 'Effacer' }))
    expect(api.removeCheckin).toHaveBeenCalledWith(DAY)
    expect(screen.getByRole('button', { name: 'Humeur : excellente (5 sur 5)' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() =>
      expect(api.upsertCheckin).toHaveBeenCalledWith({ day: DAY, mood: 5, energy: 3 }),
    )
    expect(
      await screen.findByRole('button', { name: 'Humeur : excellente (5 sur 5)', pressed: true }),
    ).toBeInTheDocument()
  })
})
