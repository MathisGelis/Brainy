import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/connexion" replace />
  return <Outlet />
}
