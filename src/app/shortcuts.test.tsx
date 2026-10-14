import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { App } from './App'
import { Providers } from './Providers'

// Supabase simulé : session active, toutes les tables vides.
vi.mock('@/lib/supabase', () => {
  const empty = Promise.resolve({ data: [], error: null })
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'order', 'gte', 'lt', 'eq', 'range']) builder[m] = () => builder
  builder.then = (resolve: (v: unknown) => unknown) => empty.then(resolve)
  return {
    supabase: {
      from: () => builder,
      auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } as Session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: vi.fn(),
      },
    },
  }
})

async function renderApp() {
  window.location.hash = '#/'
  render(
    <Providers>
      <App />
    </Providers>,
  )
  await screen.findByRole('heading', { name: "Aujourd'hui" })
}

describe('raccourcis clavier', () => {
  it('g puis b ouvre le Budget', async () => {
    await renderApp()
    await userEvent.keyboard('gb')
    expect(await screen.findByRole('heading', { name: 'Budget' })).toBeInTheDocument()
  })

  it("n ouvre l'ajout rapide, Échap le ferme", async () => {
    await renderApp()
    await userEvent.keyboard('n')
    expect(await screen.findByRole('dialog', { name: 'Ajout rapide' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Nouvelle todo')).toHaveFocus()

    // taper « n » dans un champ ne déclenche pas de raccourci
    await userEvent.keyboard('nouveau')
    expect(screen.getByLabelText('Nouvelle todo')).toHaveValue('nouveau')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Ajout rapide (n)' })).toHaveFocus()
  })

  it('? affiche la liste des raccourcis', async () => {
    await renderApp()
    await userEvent.keyboard('?')
    expect(screen.getByRole('dialog', { name: 'Raccourcis clavier' })).toBeInTheDocument()
  })

  it('/ va à la recherche des notes', async () => {
    await renderApp()
    await userEvent.keyboard('/')
    await waitFor(() => expect(screen.getByLabelText('Rechercher dans les notes')).toHaveFocus())
  })
})
