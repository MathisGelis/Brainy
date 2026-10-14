import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { App } from './App'
import { Providers } from './Providers'

// Supabase simulé : session active, toutes les tables vides.
vi.mock('@/lib/supabase', () => {
  const empty = Promise.resolve({ data: [], error: null })
  const builder: Record<string, unknown> = {}
  for (const m of [
    'select',
    'order',
    'gte',
    'lt',
    'eq',
    'range',
    'in',
    'insert',
    'update',
    'delete',
    'upsert',
  ])
    builder[m] = () => builder
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

  it('Ctrl+K ouvre la palette : recherche puis Entrée pour y aller', async () => {
    await renderApp()
    await userEvent.keyboard('{Control>}k{/Control}')
    const input = await screen.findByRole('combobox', { name: 'Rechercher ou créer' })
    expect(input).toHaveFocus()
    await userEvent.type(input, 'budg')
    expect(screen.getByRole('option', { name: /Aller à Budget/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Budget' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Palette de commandes' })).not.toBeInTheDocument()
  })

  it('la palette crée une todo depuis la saisie', async () => {
    await renderApp()
    await userEvent.keyboard('{Control>}k{/Control}')
    const input = await screen.findByRole('combobox', { name: 'Rechercher ou créer' })
    await userEvent.type(input, 'Appeler Léa demain')
    expect(screen.getByRole('option', { name: /Créer la todo « Appeler Léa »/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByText('Todo ajoutée')).toBeInTheDocument()
  })

  it('flèches pour naviguer, Échap pour fermer', async () => {
    await renderApp()
    await userEvent.keyboard('{Control>}k{/Control}')
    await screen.findByRole('combobox', { name: 'Rechercher ou créer' })
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowUp}{ArrowUp}')
    expect(screen.getAllByRole('option').at(-1)).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Palette de commandes' }),
      ).not.toBeInTheDocument(),
    )
  })
})
