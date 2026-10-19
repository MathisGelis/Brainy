import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function RequireAuth() {
  const { session, loading, offline } = useAuth()
  if (loading) return null
  if (!session && !offline) return <Navigate to="/connexion" replace />
  return <Outlet />
}
