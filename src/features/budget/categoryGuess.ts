import { fold } from '@/lib/naturalDate'
import type { Category, Expense } from './types'

/** Mots trop vagues pour désigner une catégorie. */
const STOPWORDS = new Set([
  'les',
  'des',
  'une',
  'pour',
  'avec',
  'chez',
  'dans',
  'sur',
  'par',
  'aux',
  'du',
  'de',
  'la',
  'le',
  'et',
  'en',
  'au',
  'mon',
  'ma',
  'mes',
  'ton',
  'ta',
  'tes',
  'son',
  'sa',
  'ses',
  'the',
  'and',
])

const normalize = (text: string) =>
  fold(text)
    .replace(/[^\p{L}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokens = (text: string) =>
  normalize(text)
    .split(' ')
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))

type Counts = Map<string, number>

/** Ce que l'historique sait : note complète → catégories, et mot → catégories. */
export type GuessIndex = {
  exact: Map<string, Counts>
  words: Map<string, Counts>
}

const bump = (map: Map<string, Counts>, key: string, categoryId: string) => {
  const counts = map.get(key) ?? new Map<string, number>()
  counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1)
  map.set(key, counts)
}

/** Indexe les dépenses passées qui ont une note et une catégorie encore active. */
export function buildGuessIndex(expenses: Expense[], categories: Category[]): GuessIndex {
  const active = new Set(categories.filter((c) => !c.archived).map((c) => c.id))
  const index: GuessIndex = { exact: new Map(), words: new Map() }
  for (const e of expenses) {
    if (!e.note || !e.category_id || !active.has(e.category_id)) continue
    const note = normalize(e.note)
    if (!note) continue
    bump(index.exact, note, e.category_id)
    for (const w of new Set(tokens(e.note))) bump(index.words, w, e.category_id)
  }
  return index
}

/** Catégorie la plus fréquente, si elle l'emporte nettement (plus de 70 % des voix : 3 contre 1, pas 2 contre 1). */
function clearWinner(scores: Counts, minScore: number): string | null {
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])
  const total = ranked.reduce((sum, [, s]) => sum + s, 0)
  const [best] = ranked
  if (!best || best[1] < minScore || best[1] / total < 0.7) return null
  return best[0]
}

/**
 * Devine la catégorie d'une note d'après les dépenses passées :
 * « carrefour » → Courses si les dépenses « Carrefour » étaient presque toujours en Courses.
 * Renvoie null quand l'historique est muet ou partagé.
 */
export function guessCategory(index: GuessIndex, note: string | null): string | null {
  if (!note) return null
  const exact = index.exact.get(normalize(note))
  if (exact) {
    const winner = clearWinner(exact, 1)
    if (winner) return winner
  }
  const scores: Counts = new Map()
  for (const t of tokens(note)) {
    let counts = index.words.get(t)
    let weight = 1
    if (!counts && t.length >= 4) {
      // mot en cours de frappe (« carref ») : début d'un mot connu, avec moins de poids
      const known = [...index.words.keys()].find((w) => w.startsWith(t))
      counts = known ? index.words.get(known) : undefined
      weight = 0.75
    }
    if (!counts) continue
    const total = [...counts.values()].reduce((s, n) => s + n, 0)
    // chaque mot pèse 1 au plus, réparti selon ses catégories passées
    for (const [id, n] of counts) scores.set(id, (scores.get(id) ?? 0) + (weight * n) / total)
  }
  return clearWinner(scores, 0.5)
}
