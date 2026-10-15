import { useMissingMigrations } from '@/lib/schemaCheck'

/** Bandeau affiché tant que des migrations du dossier supabase/migrations manquent dans la base. */
export function SchemaBanner() {
  const { missing, recheck, isFetching } = useMissingMigrations()
  if (missing.length === 0) return null
  return (
    <section
      role="alert"
      aria-labelledby="schema-title"
      className="mb-6 flex flex-col gap-2 rounded-2xl border border-[var(--field-border)] bg-surface p-4 text-sm"
    >
      <h2 id="schema-title" className="font-semibold text-danger">
        La base de données n’est pas à jour
      </h2>
      <p>
        Certaines fonctions ne pourront pas enregistrer. Dans Supabase → SQL Editor, exécutez dans
        l’ordre ces fichiers du dossier <code>supabase/migrations</code> :
      </p>
      <ol className="list-decimal pl-5 font-mono text-xs">
        {missing.map((file) => (
          <li key={file}>{file}</li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => void recheck()}
        disabled={isFetching}
        className="min-h-11 self-start rounded-full px-3 font-semibold text-accent transition-colors hover:bg-bg disabled:opacity-50 md:min-h-9"
      >
        {isFetching ? 'Vérification…' : 'Revérifier'}
      </button>
    </section>
  )
}
