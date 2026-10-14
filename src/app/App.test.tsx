import { render, screen } from '@testing-library/react'
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

  it("affiche Aujourd'hui puis navigue vers Budget avec une session", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } as Session } })
    renderApp()
    expect(await screen.findByRole('heading', { name: "Aujourd'hui" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Budget' }))
    expect(await screen.findByRole('heading', { name: 'Budget' })).toBeInTheDocument()
  })
})
