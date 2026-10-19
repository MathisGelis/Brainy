import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type AuthState = {
  session: Session | null
  loading: boolean
  /**
   * Session gardée sur l'appareil mais pas rafraîchie faute de réseau (jeton expiré, hors ligne) :
   * on reste dans l'app, en lecture ; supabase-js la rafraîchit au retour du réseau.
   */
  offline: boolean
}

const AuthContext = createContext<AuthState | null>(null)

/** Cache des lectures Supabase du service worker (voir vite.config.ts). */
export const DATA_CACHE = 'supabase-data'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, offline: false })

  useEffect(() => {
    void supabase.auth.getSession().then(({ data, error }) => {
      setState({
        session: data.session,
        loading: false,
        offline: !data.session && isAuthRetryableFetchError(error),
      })
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // L'état initial vient de getSession, qui distingue « pas de session » de « pas de réseau ».
      if (event === 'INITIAL_SESSION') return
      setState((s) => ({
        session,
        loading: false,
        offline: !session && event !== 'SIGNED_OUT' && s.offline,
      }))
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}

export function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

/** Déconnexion : les données gardées pour le hors ligne quittent aussi l'appareil. */
export async function signOut() {
  const result = await supabase.auth.signOut()
  try {
    await globalThis.caches?.delete(DATA_CACHE)
  } catch {
    /* pas de Cache Storage (navigation privée, ancien navigateur) */
  }
  return result
}
