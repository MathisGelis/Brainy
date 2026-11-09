import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { Providers } from './Providers'
import { App } from './App'

const getSession = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

function renderApp() {
  render(
    <Providers>
      <App />
    </Providers>,
  )
}

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '#/'
  })

  it('redirige vers la connexion sans session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    renderApp()
    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  })

  it('ouvre le Dashboard puis navigue vers Aujourd’hui et Budget avec une session', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } as Session } })
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    // barre latérale et barre d'onglets mobile sont toutes deux dans le DOM (le CSS choisit)
    await userEvent.click(screen.getAllByRole('link', { name: "Aujourd'hui" })[0]!)
    expect(await screen.findByRole('heading', { name: "Aujourd'hui" })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('link', { name: 'Budget' })[0]!)
    expect(await screen.findByRole('heading', { name: 'Budget' })).toBeInTheDocument()
  })

  it('menu « Plus » (mobile) : les autres sections, refermé par Échap', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } as Session } })
    renderApp()
    await screen.findByRole('heading', { name: 'Dashboard' })
    const more = screen.getByRole('button', { name: 'Plus' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    const menu = screen.getByRole('navigation', { name: 'Autres sections' })
    expect(within(menu).getByRole('link', { name: 'Objectifs' })).toHaveFocus()
    expect(within(menu).getByRole('link', { name: 'Plan financier' })).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'Notes' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('navigation', { name: 'Autres sections' })).toBeNull()
    expect(more).toHaveFocus()

    await userEvent.click(more)
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Autres sections' })).getByRole('link', {
        name: 'Notes',
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Notes' })).toBeInTheDocument()
    // la navigation referme le menu ; le bouton « Plus » signale la section courante
    expect(screen.queryByRole('navigation', { name: 'Autres sections' })).toBeNull()
  })
})
