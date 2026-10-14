import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { signIn, useAuth } from './useAuth'

export default function LoginPage() {
  const { session } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  useDocumentTitle('Connexion')

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setPending(true)
    setError(null)
    const { error } = await signIn(String(form.get('email')), String(form.get('password')))
    setPending(false)
    if (error) setError('Email ou mot de passe incorrect.')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Cockpit</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input label="Email" name="email" type="email" autoComplete="email" required autoFocus />
        <Input
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          Se connecter
        </Button>
      </form>
    </main>
  )
}
