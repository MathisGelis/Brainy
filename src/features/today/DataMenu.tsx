import { useToast } from '@/components/ui'
import { signOut } from '@/features/auth/useAuth'
import { useExport } from '@/features/export/useExport'

const button =
  'min-h-11 rounded-full border border-[var(--field-border)] bg-bg px-4 transition-colors hover:text-text disabled:opacity-50 md:min-h-9'

/** Menu discret en bas de l'accueil : export des données et déconnexion (seul accès sur mobile). */
export function DataMenu() {
  const toast = useToast()
  const { pending, exportJSON, exportExpensesCSV } = useExport({ onError: (m) => toast.show(m) })
  return (
    <details className="mt-12 text-xs text-muted">
      <summary className="min-h-11 cursor-pointer content-center hover:text-text">
        Compte et données
      </summary>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void exportJSON()}
          className={button}
        >
          Exporter tout (JSON)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void exportExpensesCSV()}
          className={button}
        >
          Exporter les dépenses (CSV)
        </button>
        <button type="button" onClick={() => void signOut()} className={button}>
          Déconnexion
        </button>
      </div>
    </details>
  )
}
