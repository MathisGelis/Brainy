/** Taille de page : Supabase plafonne par défaut chaque réponse à 1000 lignes. */
export const PAGE_SIZE = 1000

type PageResult = { data: unknown[] | null; error: unknown }

/**
 * Lit toutes les lignes d'une requête, page par page, pour ne jamais tronquer silencieusement.
 * `page(from, to)` doit appliquer `.range(from, to)` sur une requête à l'ordre déterministe.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const chunk = (data ?? []) as T[]
    rows.push(...chunk)
    if (chunk.length < PAGE_SIZE) return rows
  }
}
