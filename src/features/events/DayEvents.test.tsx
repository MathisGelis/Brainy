import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@/components/ui'
import { pickOption } from '@/test/pickOption'
import { DayEvents } from './DayEvents'
import * as api from './eventsApi'
import type { CalendarEvent } from './types'

vi.mock('./eventsApi')

const yoga: CalendarEvent = {
  id: 'e1',
  title: 'Yoga',
  start_on: '2026-10-05',
  end_on: '2026-10-05',
  start_time: '19:00:00',
  end_time: '20:00:00',
  note: null,
  repeat: 'weekly',
  repeat_every: 1,
  repeat_days: [1],
  repeat_until: null,
  skipped: [],
  created_at: '2026-01-01T00:00:00Z',
}

let server: CalendarEvent[] = []

function renderDay(day: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <DayEvents day={day} onError={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('DayEvents', () => {
  beforeEach(() => {
    server = [{ ...yoga }]
    vi.mocked(api.fetchEvents).mockImplementation(async () => server.map((e) => ({ ...e })))
    vi.mocked(api.insertEvent).mockImplementation(async (e) => {
      server = [...server, e]
    })
    vi.mocked(api.patchEvent).mockImplementation(async (id, patch) => {
      server = server.map((e) => (e.id === id ? { ...e, ...patch } : e))
    })
    vi.mocked(api.removeEvent).mockImplementation(async (id) => {
      server = server.filter((e) => e.id !== id)
    })
  })

  it('montre l’occurrence du jour avec son heure et sa récurrence', async () => {
    renderDay('2026-10-19') // un lundi
    const row = await screen.findByRole('button', { name: 'Modifier « Yoga »' })
    expect(row).toHaveTextContent('19h–20h')
    expect(row).toHaveTextContent('Toutes les semaines le lundi')
  })

  it('ajoute un séjour en une phrase et dit où il a été placé', async () => {
    renderDay('2026-10-20')
    await userEvent.type(
      screen.getByLabelText(/Nouvel événement pour le/),
      'En déplacement à Lyon du 12 au 14 novembre{Enter}',
    )
    await waitFor(() =>
      expect(api.insertEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'En déplacement à Lyon',
          start_on: expect.stringMatching(/-11-12$/),
          end_on: expect.stringMatching(/-11-14$/),
          repeat: null,
        }),
      ),
    )
    expect(
      await screen.findByText(/« En déplacement à Lyon » du 12 nov\. au 14 nov\./),
    ).toBeInTheDocument()
  })

  it('supprime une seule occurrence, puis l’annulation la remet', async () => {
    renderDay('2026-10-19')
    await userEvent.click(await screen.findByRole('button', { name: 'Modifier « Yoga »' }))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer ce jour-là' }))
    await waitFor(() =>
      expect(api.patchEvent).toHaveBeenCalledWith('e1', { skipped: ['2026-10-19'] }),
    )
    expect(screen.queryByRole('button', { name: 'Modifier « Yoga »' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(api.patchEvent).toHaveBeenLastCalledWith('e1', { skipped: [] }))
    expect(await screen.findByRole('button', { name: 'Modifier « Yoga »' })).toBeInTheDocument()
  })

  it('modifie la série : titre, jours et fin de la répétition', async () => {
    renderDay('2026-10-19')
    await userEvent.click(await screen.findByRole('button', { name: 'Modifier « Yoga »' }))
    const title = screen.getByLabelText('Titre de l’événement')
    await userEvent.clear(title)
    await userEvent.type(title, 'Yoga doux')
    await userEvent.tab()
    expect(api.patchEvent).toHaveBeenCalledWith('e1', { title: 'Yoga doux' })

    await userEvent.click(screen.getByRole('button', { name: 'jeudi' }))
    await waitFor(() => expect(api.patchEvent).toHaveBeenCalledWith('e1', { repeat_days: [1, 4] }))

    await pickOption('Répétition', 'Ne se répète pas')
    await waitFor(() =>
      expect(api.patchEvent).toHaveBeenLastCalledWith('e1', {
        repeat: null,
        repeat_every: 1,
        repeat_days: null,
        repeat_until: null,
        skipped: [],
      }),
    )
  })

  it('supprime toute la série', async () => {
    renderDay('2026-10-19')
    await userEvent.click(await screen.findByRole('button', { name: 'Modifier « Yoga »' }))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer la série' }))
    await waitFor(() => expect(api.removeEvent).toHaveBeenCalledWith('e1'))
    expect(await screen.findByText('Série supprimée')).toBeInTheDocument()
  })
})
