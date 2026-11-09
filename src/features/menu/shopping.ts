import { baseName, normalizeName, stripQuantity } from './nutrition'
import type { MealItem, PantryItem, RecipeFull } from './types'

/** Clé de stock : nom de base normalisé (« Riz basmati (cuit) » et « riz basmati » vont ensemble). */
export const pantryKey = (name: string) => normalizeName(baseName(name))

export type Quantity = { key: string; name: string; grams: number }

/** Ce qu'un élément de repas consomme : l'aliment, ou les ingrédients de la recette au prorata. */
export function ingredientGrams(item: MealItem, recipes: RecipeFull[]): Quantity[] {
  if (!item.recipe_id) {
    const name = baseName(item.name)
    return [{ key: pantryKey(name), name, grams: item.grams }]
  }
  const recipe = recipes.find((r) => r.id === item.recipe_id)
  if (!recipe) return []
  const total = recipe.items.reduce((s, i) => s + i.grams, 0)
  if (total <= 0) return []
  const ratio = item.grams / total
  return recipe.items.map((i) => {
    const name = baseName(i.name)
    return { key: pantryKey(name), name, grams: i.grams * ratio }
  })
}

/** Besoins regroupés par aliment, arrondis au gramme, dans l'ordre d'apparition. */
export function needsOf(items: MealItem[], recipes: RecipeFull[]): Quantity[] {
  const byKey = new Map<string, Quantity>()
  for (const item of items)
    for (const q of ingredientGrams(item, recipes)) {
      if (!q.key) continue
      const seen = byKey.get(q.key)
      if (seen) seen.grams += q.grams
      else byKey.set(q.key, { ...q })
    }
  return [...byKey.values()]
    .map((q) => ({ ...q, grams: Math.round(q.grams) }))
    .filter((q) => q.grams > 0)
}

export type NeedLine = Quantity & {
  /** Quantité à la maison ; null si jamais renseignée */
  stock: number | null
  /** Ce qui manque, arrondi aux 10 g supérieurs ; 0 = assez */
  toBuy: number
}

/** Besoins face au stock : ce qu'il reste à acheter. */
export function shoppingNeeds(needs: Quantity[], pantry: PantryItem[]): NeedLine[] {
  return needs.map((n) => {
    const stock = pantry.find((p) => p.key === n.key)?.grams ?? null
    const missing = n.grams - (stock ?? 0)
    return { ...n, stock, toBuy: missing > 0 ? Math.ceil(missing / 10) * 10 : 0 }
  })
}

/** 400 → « 400 g », 1250 → « 1,25 kg ». */
export function formatGrams(g: number): string {
  if (g < 1000) return `${Math.round(g)} g`
  return `${String(Math.round(g / 10) / 100).replace('.', ',')} kg`
}

/** « Riz — 400 g » : titre d'un article de la liste de courses avec sa quantité. */
export const shoppingTitle = (name: string, grams: number) => `${name} — ${formatGrams(grams)}`

/** Lit la quantité d'un article : « Riz — 1,2 kg » → { name: 'Riz', grams: 1200 }. */
export function parseShoppingTitle(title: string): { name: string; grams: number | null } {
  const name = stripQuantity(title)
  if (name === title.trim()) return { name, grams: null }
  const m = /([\d.,]+)\s*(k?g)$/i.exec(title.trim())
  if (!m) return { name, grams: null }
  const value = Number(m[1]!.replace(',', '.'))
  if (!Number.isFinite(value)) return { name, grams: null }
  return { name, grams: Math.round(m[2]!.toLowerCase() === 'kg' ? value * 1000 : value) }
}

/**
 * Nouveau stock après des entrées (achats, > 0) ou des sorties (repas mangés, < 0) :
 * jamais sous zéro ; une sortie sans stock connu ne crée rien.
 */
export function adjustPantry(
  pantry: PantryItem[],
  deltas: Quantity[],
  makeId: () => string = () => crypto.randomUUID(),
  now: string = new Date().toISOString(),
): PantryItem[] {
  const changed = new Map<string, PantryItem>()
  for (const d of deltas) {
    if (!d.key || d.grams === 0) continue
    const current = changed.get(d.key) ?? pantry.find((p) => p.key === d.key)
    if (!current && d.grams < 0) continue
    const grams = Math.max(0, Math.round((current?.grams ?? 0) + d.grams))
    changed.set(d.key, {
      id: current?.id ?? makeId(),
      key: d.key,
      name: current?.name ?? d.name,
      grams,
      updated_at: now,
    })
  }
  return [...changed.values()]
}
