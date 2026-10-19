/** Codes PostgREST / Postgres d'une colonne ou d'une table inconnue : une migration manque. */
const SCHEMA_ERRORS = new Set(['PGRST204', 'PGRST205', '42703', '42P01'])

export function isSchemaError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    SCHEMA_ERRORS.has(String((error as { code: unknown }).code))
  )
}

/** Message d'échec d'enregistrement ; une migration manquante est signalée comme telle. */
export function saveErrorMessage(error: unknown): string {
  return isSchemaError(error)
    ? "Enregistrement impossible : la base n'est pas à jour (une migration manque, voir le bandeau)."
    : "L'enregistrement a échoué. Vos modifications ont été annulées."
}
