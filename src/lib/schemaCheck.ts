import { useQuery } from '@tanstack/react-query'
import { isSchemaError } from './schemaErrors'
import { supabase } from './supabase'

/** Une sonde par migration : une colonne ou une table qu'elle ajoute. */
export const MIGRATIONS = [
  { file: '0002_enrichissements.sql', table: 'expenses', columns: 'recurring_id' },
  { file: '0003_rituels_epargne.sql', table: 'todos', columns: 'focus_on' },
  { file: '0004_victoires_semaine.sql', table: 'todos', columns: 'focus_week' },
  { file: '0005_menu.sql', table: 'foods', columns: 'id' },
  { file: '0006_recettes.sql', table: 'meal_items', columns: 'recipe_id' },
] as const

/** Migrations absentes de la base, dans l'ordre (les erreurs réseau ne comptent pas). */
export async function missingMigrations(): Promise<string[]> {
  const results = await Promise.all(
    MIGRATIONS.map(async (m): Promise<string | null> => {
      const { error } = await supabase.from(m.table).select(m.columns).limit(0)
      return error && isSchemaError(error) ? m.file : null
    }),
  )
  return results.filter((f): f is string => f !== null)
}

/** Vérifié une fois par session : la base suit-elle le code ? */
export function useMissingMigrations() {
  const query = useQuery({
    queryKey: ['schema-check'],
    queryFn: missingMigrations,
    staleTime: Infinity,
    retry: false,
  })
  return { missing: query.data ?? [], recheck: query.refetch, isFetching: query.isFetching }
}
