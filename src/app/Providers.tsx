import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { AuthProvider } from '@/features/auth/useAuth'
import { ToastProvider } from '@/components/ui'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Hors ligne, les lectures tentent quand même le réseau : le service worker répond
          // avec la dernière réponse connue. Une modification hors ligne échoue (et s'annule)
          // au lieu d'attendre en silence.
          queries: { staleTime: 30_000, retry: 1, networkMode: 'offlineFirst' },
          mutations: { networkMode: 'always' },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
