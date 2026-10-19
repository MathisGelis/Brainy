import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui'
import * as api from './checkinsApi'
import { DayWin } from './DayWin'
import type { DayCheckin } from './types'

vi.mock('./checkinsApi')

const DAY = '2026-10-14'
let server: DayCheckin[] = []

function renderWin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <DayWin day={DAY} onError={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('DayWin', () => {
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

  it('enregistre la victoire avec Entrée, sans toucher à l’humeur', async () => {
    server = [{ day: DAY, mood: 4, energy: null, win: null }]
    renderWin()
    const input = await screen.findByLabelText('Une victoire aujourd’hui ?')
    await waitFor(() => expect(input).toBeEnabled())
    await userEvent.type(input, '  Dossier rendu à temps {Enter}')
    expect(api.upsertCheckin).toHaveBeenCalledWith({
      day: DAY,
      mood: 4,
      energy: null,
      win: 'Dossier rendu à temps',
    })
    expect(input).toHaveValue('Dossier rendu à temps')
  })

  it('se modifie, puis s’efface avec « Annuler » possible', async () => {
    server = [{ day: DAY, mood: null, energy: null, win: 'Couru 5 km' }]
    renderWin()
    const input = await screen.findByLabelText('Une victoire aujourd’hui ?')
    await waitFor(() => expect(input).toHaveValue('Couru 5 km'))

    await userEvent.clear(input)
    await userEvent.type(input, 'Couru 10 km')
    await userEvent.tab()
    await waitFor(() =>
      expect(api.upsertCheckin).toHaveBeenCalledWith(
        expect.objectContaining({ win: 'Couru 10 km' }),
      ),
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Effacer la victoire' }))
    // plus d'humeur ni d'énergie : la saisie du jour disparaît
    await waitFor(() => expect(api.removeCheckin).toHaveBeenCalledWith(DAY))
    expect(input).toHaveValue('')

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(input).toHaveValue('Couru 10 km'))
  })
})
