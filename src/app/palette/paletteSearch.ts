import { fold } from '@/lib/naturalDate'

export type PaletteGroup =
  'Commandes' | 'Créer' | 'Todos' | 'Notes' | 'Objectifs' | 'Habitudes' | 'Dépenses'

export type PaletteItem = {
  id: string
  group: PaletteGroup
  label: string
  /** Texte secondaire (date, montant, liste…) */
  hint?: string
  /** Mots supplémentaires pris en compte par la recherche */
  keywords?: string
  run: () => void
}

const GROUP_ORDER: PaletteGroup[] = [
  'Commandes',
  'Todos',
  'Notes',
  'Objectifs',
  'Habitudes',
  'Dépenses',
  'Créer',
]
const PER_GROUP = 5

/**
 * Score d'un élément pour la requête : chaque mot doit apparaître (sans accents ni casse).
 * Bonus quand le libellé commence par la requête ou qu'un mot commence par un terme.
 */
export function scoreItem(item: PaletteItem, query: string): number {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 0
  const label = fold(item.label)
  const haystack = `${label} ${fold(item.hint ?? '')} ${fold(item.keywords ?? '')}`
  if (!terms.every((t) => haystack.includes(t))) return -1
  let score = 1
  if (label.startsWith(fold(query.trim()))) score += 10
  for (const t of terms) {
    if (new RegExp(`(^|[^\\p{L}\\d])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(label))
      score += 3
    else if (label.includes(t)) score += 1
  }
  return score
}

/**
 * Résultats de la palette. Sans requête : les commandes seules.
 * Avec requête : les meilleurs résultats par groupe (5 max), puis les actions de création.
 */
export function searchPalette(
  items: PaletteItem[],
  create: PaletteItem[],
  query: string,
): PaletteItem[] {
  if (!query.trim()) return items.filter((i) => i.group === 'Commandes')
  const scored = items
    .map((item) => ({ item, score: scoreItem(item, query) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
  const results: PaletteItem[] = []
  for (const group of GROUP_ORDER) {
    if (group === 'Créer') continue
    results.push(
      ...scored
        .filter((x) => x.item.group === group)
        .slice(0, PER_GROUP)
        .map((x) => x.item),
    )
  }
  return [...results, ...create]
}
