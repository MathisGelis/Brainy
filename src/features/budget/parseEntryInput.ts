import { extractDate, fold, cut } from '@/lib/naturalDate'
import { parseAmountToCents } from '@/lib/money'
import type { Category, EntryKind } from './types'

export type ParsedEntry = {
  kind: EntryKind
  amount_cents: number | null
  category_id: string | null
  spent_on: string | null
  note: string | null
}

/** Mots-clés par catégorie suggérée (comparés sans accents). */
const SYNONYMS: Record<string, string[]> = {
  courses: [
    'courses',
    'supermarche',
    'marche',
    'epicerie',
    'boulangerie',
    'carrefour',
    'leclerc',
    'auchan',
    'lidl',
    'monoprix',
    'franprix',
    'intermarche',
    'picard',
  ],
  restaurants: [
    'resto',
    'restau',
    'restaurant',
    'dejeuner',
    'diner',
    'brunch',
    'cafe',
    'bar',
    'pizza',
    'sushi',
    'burger',
    'kebab',
    'mcdo',
    'deliveroo',
    'ubereats',
  ],
  transport: [
    'transport',
    'uber',
    'taxi',
    'train',
    'sncf',
    'tgv',
    'metro',
    'bus',
    'navigo',
    'essence',
    'carburant',
    'peage',
    'parking',
    'velib',
    'avion',
  ],
  logement: ['loyer', 'logement', 'electricite', 'edf', 'gaz', 'eau', 'charges', 'travaux', 'ikea'],
  loisirs: [
    'loisirs',
    'cine',
    'cinema',
    'concert',
    'livre',
    'livres',
    'jeu',
    'jeux',
    'musee',
    'sortie',
    'theatre',
    'expo',
    'vacances',
  ],
  sante: [
    'sante',
    'pharmacie',
    'medecin',
    'docteur',
    'dentiste',
    'mutuelle',
    'kine',
    'osteo',
    'opticien',
  ],
  abonnements: [
    'abonnement',
    'abonnements',
    'netflix',
    'spotify',
    'deezer',
    'disney',
    'icloud',
    'forfait',
    'internet',
    'box',
    'salle',
  ],
}

/** Mots qui ne font que nommer la catégorie : inutile de les garder en note. */
const BARE = new Set(['resto', 'restau', 'courses', 'loyer', 'essence'])

const words = (text: string) =>
  fold(text)
    .split(/[^\p{L}\d]+/u)
    .filter((w) => w.length >= 3)

function matchCategory(text: string, categories: Category[]): Category | null {
  const tokens = words(text)
  const active = categories.filter((c) => !c.archived)
  // 1. nom de catégorie (ou son début) présent tel quel
  for (const c of active) {
    const name = fold(c.name)
    if (tokens.some((t) => name === t || name === `${t}s` || (t.length >= 4 && name.startsWith(t))))
      return c
  }
  // 2. mot-clé associé à une catégorie suggérée
  for (const c of active) {
    const keywords = SYNONYMS[fold(c.name)] ?? []
    if (tokens.some((t) => keywords.includes(t))) return c
  }
  return null
}

/**
 * « 12,50 resto hier » → 12,50 €, Restaurants, hier. « +2400 salaire » → revenu.
 * Le reste du texte devient la note.
 */
export function parseEntryInput(input: string, categories: Category[], today: string): ParsedEntry {
  let text = input.trim()
  let kind: EntryKind = 'expense'
  if (text.startsWith('+')) {
    kind = 'income'
    text = text.slice(1).trim()
  }

  let amount: number | null = null
  const m =
    /(?<![\p{L}\d])((?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,]\d{1,2})?)\s*(?:€|eur(?:os?)?)?(?![\p{L}\d])/iu.exec(
      text,
    )
  if (m) {
    amount = parseAmountToCents(m[1]!)
    if (amount !== null) text = cut(text, m.index, m.index + m[0].length)
  }

  let spentOn: string | null = null
  const date = extractDate(text, today, 'past')
  if (date) {
    spentOn = date.value
    text = date.rest
  }

  const category = kind === 'expense' ? matchCategory(text, categories) : null
  const rest = text.trim()
  const bare = category && (fold(rest) === fold(category.name) || BARE.has(fold(rest)))
  return {
    kind,
    amount_cents: amount,
    category_id: category?.id ?? null,
    spent_on: spentOn,
    note: rest && !bare ? rest : null,
  }
}
