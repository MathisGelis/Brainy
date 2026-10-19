import { AuthRetryableFetchError } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { RequireAuth } from './RequireAuth'
import { AuthProvider } from './useAuth'

function renderApp() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/connexion" element={<p>Connexion</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<p>Accueil</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
      data: { subscription: { id: 's', callback: () => {}, unsubscribe: () => {} } },
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('renvoie vers la connexion sans session', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    })
    renderApp()
    expect(await screen.findByText('Connexion')).toBeInTheDocument()
  })

  it('garde l’app ouverte hors ligne quand le jeton n’a pas pu être rafraîchi', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    })
    renderApp()
    expect(await screen.findByText('Accueil')).toBeInTheDocument()
  })
})
