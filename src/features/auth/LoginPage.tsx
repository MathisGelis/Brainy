import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Input, ThemeToggle } from '@/components/ui'
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
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="fixed top-[calc(env(safe-area-inset-top)+14px)] right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="glass w-full max-w-sm animate-rise rounded-[32px] px-6 pt-8 pb-6">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span aria-hidden className="brand-orb size-14 rounded-full" />
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Cockpit</h1>
          <p className="text-muted">Votre journée, en un coup d'œil.</p>
        </div>
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
          <Button type="submit" disabled={pending} className="mt-2 w-full">
            Se connecter
          </Button>
        </form>
      </div>
    </main>
  )
}
