import { signOut } from '@/features/auth/useAuth'

/** Menu discret en bas de l'accueil (export ajouté ensuite) ; seul accès à la déconnexion sur mobile. */
export function DataMenu() {
  return (
    <details className="mt-12 text-xs text-muted">
      <summary className="min-h-11 cursor-pointer content-center hover:text-text">
        Compte et données
      </summary>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void signOut()}
          className="min-h-11 rounded border border-border px-3 hover:text-text md:min-h-9"
        >
          Déconnexion
        </button>
      </div>
    </details>
  )
}
