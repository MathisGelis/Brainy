import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import * as api from './notesApi'
import NotesPage from './NotesPage'
import type { Note } from './types'

vi.mock('./notesApi')

const note = (id: string, title: string, content = '', overrides: Partial<Note> = {}): Note => ({
  id,
  title,
  content,
  pinned: false,
  tags: [],
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  ...overrides,
})

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/notes/:noteId?" element={<NotesPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('NotesPage', () => {
  beforeEach(() => {
    vi.mocked(api.fetchNotes).mockResolvedValue([
      note('n1', 'Voyage', 'Lisbonne en été'),
      note('n2', 'Courses', 'Pain', { pinned: true }),
    ])
    vi.mocked(api.patchNote).mockReturnValue(new Promise<void>(() => {}))
    vi.mocked(api.insertNote).mockReturnValue(new Promise<void>(() => {}))
  })

  it('sauvegarde automatiquement après la frappe, sans bouton « Enregistrer »', async () => {
    renderAt('/notes/n1')
    const content = await screen.findByLabelText('Contenu de la note')
    await userEvent.type(content, ' et Porto')

    expect(screen.getByText('Enregistrement…')).toBeInTheDocument()
    expect(api.patchNote).not.toHaveBeenCalled()
    await waitFor(
      () =>
        expect(api.patchNote).toHaveBeenCalledWith('n1', { content: 'Lisbonne en été et Porto' }),
      { timeout: 2000 },
    )
    expect(api.patchNote).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Enregistré')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).not.toBeInTheDocument()
  })

  it('enregistre les tags normalisés', async () => {
    renderAt('/notes/n1')
    await userEvent.type(await screen.findByLabelText('Tags'), 'Projets, Été')
    await waitFor(
      () => expect(api.patchNote).toHaveBeenCalledWith('n1', { tags: ['projets', 'ete'] }),
      { timeout: 2000 },
    )
  })

  it('affiche les épinglées en premier et filtre instantanément', async () => {
    renderAt('/notes')
    const list = await screen.findByRole('list')
    const links = within(list).getAllByRole('link')
    expect(links[0]).toHaveTextContent('Courses')

    await userEvent.type(screen.getByLabelText('Rechercher dans les notes'), 'lisbonne')
    expect(within(list).getAllByRole('link')).toHaveLength(1)
    expect(within(list).getByRole('link')).toHaveTextContent('Voyage')
  })

  it('crée une note et l’ouvre aussitôt', async () => {
    renderAt('/notes')
    await screen.findByRole('list')
    await userEvent.click(screen.getByRole('button', { name: 'Nouvelle' }))

    expect(api.insertNote).toHaveBeenCalled()
    const title = await screen.findByLabelText('Titre de la note')
    expect(title).toHaveValue('')
    expect(title).toHaveFocus()
  })

  it('coche une case de liste directement dans l’aperçu (et sauvegarde)', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('n3', 'Courses', '- [ ] Pain\n- [x] Lait')])
    renderAt('/notes/n3')
    await userEvent.click(await screen.findByRole('button', { name: 'Aperçu' }))
    const pain = screen.getByRole('checkbox', { name: 'Pain' })
    expect(pain).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Lait' })).toBeChecked()

    await userEvent.click(pain)
    expect(screen.getByRole('checkbox', { name: 'Pain' })).toBeChecked()
    await waitFor(
      () => expect(api.patchNote).toHaveBeenCalledWith('n3', { content: '- [x] Pain\n- [x] Lait' }),
      {
        timeout: 2000,
      },
    )
  })
})
