import { cut, extractDate, fold } from '@/lib/naturalDate'
import type { CatalogFood } from './catalog'
import type { Food, Macros, Meal, MealItem } from './types'

export const MEALS: { id: Meal; label: string }[] = [
  { id: 'breakfast', label: 'Petit-déjeuner' },
  { id: 'lunch', label: 'Déjeuner' },
  { id: 'dinner', label: 'Dîner' },
  { id: 'snack', label: 'Collation' },
]

export const mealLabel = (meal: Meal) => MEALS.find((m) => m.id === meal)!.label

/** Repas par défaut selon l'heure : matin, midi, goûter, soir. */
export function defaultMeal(hour: number): Meal {
  if (hour < 10) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 18) return 'snack'
  return 'dinner'
}

const B = '(?<![\\p{L}\\d])'
const E = '(?![\\p{L}\\d])'
const MEAL_WORDS: [RegExp, Meal][] = [
  [
    new RegExp(`${B}(?:au |pour le )?(?:petit[- ]?dej(?:euner)?|p'?tit[- ]?dej|matin)${E}`, 'u'),
    'breakfast',
  ],
  [new RegExp(`${B}(?:au |a |ce |le )?(?:midi|dejeuner|dej)${E}`, 'u'), 'lunch'],
  [new RegExp(`${B}(?:au |ce |le )?(?:soir|diner)${E}`, 'u'), 'dinner'],
  [
    new RegExp(`${B}(?:en |au |pour le )?(?:collation|gouter|en-cas|encas|snack)${E}`, 'u'),
    'snack',
  ],
]

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
}

export type ParsedFood = {
  /** Ce qui reste pour chercher l'aliment */
  query: string
  /** Quantité en grammes (ou ml) si elle est donnée */
  grams: number | null
  /** Nombre de portions (« 2 œufs ») si c'est un compte */
  count: number | null
  meal: Meal | null
  day: string | null
}

const toNumber = (s: string) => Number(s.replace(',', '.'))

/**
 * « 200 g de poulet midi » → poulet, 200 g, déjeuner. « 2 œufs demain matin » → 2 portions, demain.
 * « poulet 150 » → 150 g ; un nombre seul inférieur à 20 est un nombre de portions.
 */
export function parseFoodInput(input: string, today: string): ParsedFood {
  let text = input.trim()
  let meal: Meal | null = null
  for (const [re, id] of MEAL_WORDS) {
    const m = re.exec(fold(text))
    if (m) {
      meal = id
      text = cut(text, m.index, m.index + m[0].length)
      break
    }
  }

  let grams: number | null = null
  let count: number | null = null
  const unit = new RegExp(`${B}(\\d+(?:[.,]\\d+)?)\\s*(kg|grammes?|gr|g|ml|cl|l)${E}`, 'u').exec(
    fold(text),
  )
  if (unit) {
    const n = toNumber(unit[1]!)
    const factor = { kg: 1000, l: 1000, cl: 10 }[unit[2]!] ?? 1
    grams = Math.round(n * factor)
    text = cut(text, unit.index, unit.index + unit[0].length)
  } else {
    // un nombre suivi de « % » fait partie du nom (« bœuf haché 5 % »)
    const bare = new RegExp(
      `${B}(\\d+(?:[.,]\\d+)?|un|une|deux|trois|quatre|cinq|six)${E}(?!\\s*%)`,
      'u',
    ).exec(fold(text))
    if (bare) {
      const n = NUMBER_WORDS[bare[1]!] ?? toNumber(bare[1]!)
      if (n >= 20) grams = Math.round(n)
      else count = n
      text = cut(text, bare.index, bare.index + bare[0].length)
    }
  }

  let day: string | null = null
  const date = extractDate(text, today, 'future')
  if (date) {
    day = date.value
    text = date.rest
  }

  const query = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:de |d['’]\s?|des |du |x\s?)/i, '')
    .trim()
  return { query, grams, count, meal, day }
}

/** Forme comparable : minuscules sans accents, ligatures dépliées, mots au singulier. */
export function normalizeName(text: string): string {
  return fold(text.replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').replace(/æ/g, 'ae'))
    .replace(/['’]/g, ' ')
    .replace(/[^\p{L}\d%\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w))
    .join(' ')
}

/** Nom de base, sans la précision entre parenthèses : « Poulet (filet cru) » → « Poulet ». */
export const baseName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '').trim()

export type FoodChoice = { kind: 'food'; food: Food } | { kind: 'catalog'; food: CatalogFood }

/** Classe un aliment pour une recherche (0 = parfait) ; null s'il ne correspond pas. */
function score(name: string, query: string): number | null {
  const n = normalizeName(name)
  const base = normalizeName(baseName(name))
  if (n === query) return 0
  if (base === query) return 1
  if (n.startsWith(query)) return 2
  const words = n.split(' ')
  const wanted = query.split(' ')
  if (wanted.every((q) => words.some((w) => w.startsWith(q)))) return 3
  return null
}

/** Aliments correspondant à la recherche : les tiens d'abord, puis la base d'aliments courants. */
export function searchFoods(
  query: string,
  foods: Food[],
  catalog: CatalogFood[],
  limit = 5,
): FoodChoice[] {
  const q = normalizeName(query)
  if (q.length < 2) return []
  const mine = new Set(foods.map((f) => normalizeName(f.name)))
  const ranked: { choice: FoodChoice; rank: number; order: number }[] = []
  foods.forEach((food, order) => {
    const s = score(food.name, q)
    if (s !== null) ranked.push({ choice: { kind: 'food', food }, rank: s, order })
  })
  catalog.forEach((food, order) => {
    if (mine.has(normalizeName(food.name))) return // déjà copié dans tes aliments
    const s = score(food.name, q)
    // à score égal, tes aliments passent devant la base
    if (s !== null) ranked.push({ choice: { kind: 'catalog', food }, rank: s + 0.5, order })
  })
  return ranked
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, limit)
    .map((r) => r.choice)
}

type Per100 = Pick<Food, 'kcal' | 'protein_dg' | 'carbs_dg' | 'fat_dg' | 'portion_g'>

/** Quantité retenue : grammes donnés, sinon portions × poids d'une portion (100 g par défaut). */
export function gramsFor(parsed: Pick<ParsedFood, 'grams' | 'count'>, food: Per100): number {
  if (parsed.grams !== null) return parsed.grams
  const portion = food.portion_g ?? 100
  return Math.max(1, Math.round((parsed.count ?? 1) * portion))
}

/** Valeurs pour une quantité donnée (arrondies à l'entier : kcal, dixièmes de gramme). */
export function scaleMacros(food: Per100, grams: number): Macros {
  const k = grams / 100
  return {
    kcal: Math.round(food.kcal * k),
    protein_dg: Math.round(food.protein_dg * k),
    carbs_dg: Math.round(food.carbs_dg * k),
    fat_dg: Math.round(food.fat_dg * k),
  }
}

/** Nouvelle quantité d'un élément de repas : on recalcule à partir de ses propres valeurs. */
export function rescaleItem(item: MealItem, grams: number): Macros {
  const k = grams / item.grams
  return {
    kcal: Math.round(item.kcal * k),
    protein_dg: Math.round(item.protein_dg * k),
    carbs_dg: Math.round(item.carbs_dg * k),
    fat_dg: Math.round(item.fat_dg * k),
  }
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (t, i) => ({
      kcal: t.kcal + i.kcal,
      protein_dg: t.protein_dg + i.protein_dg,
      carbs_dg: t.carbs_dg + i.carbs_dg,
      fat_dg: t.fat_dg + i.fat_dg,
    }),
    { kcal: 0, protein_dg: 0, carbs_dg: 0, fat_dg: 0 },
  )
}

/** 125 → « 12,5 » (dixièmes de gramme vers grammes, une décimale si utile). */
export function dgToInput(dg: number): string {
  return dg % 10 === 0 ? String(dg / 10) : (dg / 10).toFixed(1).replace('.', ',')
}

/** « 12,5 » → 125 ; null si invalide. */
export function inputToDg(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return 0
  if (!/^\d+(\.\d)?$/.test(t)) return null
  return Math.round(Number(t) * 10)
}

/** Grammes affichés pour un total : arrondis à l'entier. */
export const grams = (dg: number) => `${Math.round(dg / 10)} g`

/**
 * Aliments du menu absents de la liste de courses (comparés par nom de base) :
 * un seul par nom, dans l'ordre où ils apparaissent.
 */
export function missingFromShopping(names: string[], shopping: string[]): string[] {
  const have = new Set(shopping.map((s) => normalizeName(baseName(s))))
  const out: string[] = []
  for (const name of names) {
    const base = baseName(name)
    const key = normalizeName(base)
    if (!key || have.has(key)) continue
    have.add(key)
    out.push(base)
  }
  return out
}
