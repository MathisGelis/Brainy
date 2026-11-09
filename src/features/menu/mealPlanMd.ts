import { fold } from '@/lib/naturalDate'
import { MEALS } from './nutrition'
import type { MacroTargets, Meal } from './types'

/**
 * Plan de repas en Markdown : aliments (macros pour 100 g), recettes, repas jour par jour et
 * objectifs. Lecture tolérante (titres de tout niveau ou lignes en gras, virgules ou points
 * décimaux, ordre des colonnes libre) ; ce qui n'est pas compris est signalé, jamais deviné.
 */

/** Aliment déclaré dans le tableau « Aliments » : valeurs pour 100 g, macros en dixièmes de gramme. */
export type MdFood = {
  name: string
  kcal: number
  protein_dg: number
  carbs_dg: number
  fat_dg: number
  portion_g: number | null
  portion_label: string | null
}

/** Un élément de repas ou un ingrédient, tel qu'écrit. */
export type MdItem = {
  text: string
  name: string
  /** Quantité en grammes (ou ml) si elle est donnée */
  grams: number | null
  /** Nombre de portions ou de parts (« 2 œufs », « 2 parts ») */
  count: number | null
  /** Valeurs données sur la ligne même : « Salade (450 kcal, P 25, G 30, L 22) » */
  macros: { kcal: number; protein_dg: number; carbs_dg: number; fat_dg: number } | null
}

export type MdRecipe = { name: string; servings: number; items: MdItem[] }

/** Jour du plan : un jour de la semaine (1 = lundi), tous les jours, ou une date précise. */
export type MdDayKey =
  { kind: 'weekday'; weekday: number } | { kind: 'every' } | { kind: 'date'; date: string }

export type MdDay = { key: MdDayKey; label: string; meals: { meal: Meal; items: MdItem[] }[] }

export type MealPlanMd = {
  foods: MdFood[]
  recipes: MdRecipe[]
  days: MdDay[]
  targets: Partial<MacroTargets> | null
  /** Lignes non comprises, avec leur numéro */
  problems: string[]
}

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const MEAL_WORDS: [RegExp, Meal][] = [
  [/^(petit[- ]?dej(euner)?|p'?tit[- ]?dej|matin|breakfast)/, 'breakfast'],
  [/^(dejeuner|dej|midi|lunch)/, 'lunch'],
  [/^(diner|soir|souper|dinner)/, 'dinner'],
  [/^(collation|gouter|en-?cas|snack|encas)/, 'snack'],
]

/** « 12,5 » ou « 12.5 g » → 12.5 ; null si ce n'est pas un nombre. */
export function num(text: string | undefined): number | null {
  if (text === undefined) return null
  const m = /-?\d+(?:[.,]\d+)?/.exec(text.replace(/\s/g, ''))
  return m ? Number(m[0].replace(',', '.')) : null
}

const dg = (grams: number) => Math.round(grams * 10)

/** Nom de section ou de jour : sans #, **, ni ponctuation finale. */
function heading(line: string): { level: number; text: string } | null {
  const h = /^(#{1,6})\s+(.*)$/.exec(line)
  if (h)
    return {
      level: h[1]!.length,
      text: h[2]!
        .replace(/[*_:]+$/g, '')
        .replace(/^\*+|\*+$/g, '')
        .trim(),
    }
  const bold = /^\*\*(.+?)\*\*\s*:?\s*$/.exec(line)
  return bold ? { level: 4, text: bold[1]!.trim() } : null
}

function dayKey(text: string): MdDayKey | null {
  const t = fold(text).trim()
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(t)
  if (iso) return { kind: 'date', date: iso[0] }
  if (/^(tous les jours|chaque jour|quotidien)/.test(t)) return { kind: 'every' }
  const i = WEEKDAYS.findIndex((w) => t.startsWith(w))
  return i >= 0 ? { kind: 'weekday', weekday: i + 1 } : null
}

export function mealOf(text: string): Meal | null {
  const t = fold(text).trim()
  return MEAL_WORDS.find(([re]) => re.test(t))?.[1] ?? null
}

/** Valeurs données entre parenthèses : « 450 kcal, P 25 g, G 30, L 22 » (ou Protéines/Glucides/Lipides). */
function inlineMacros(inside: string): MdItem['macros'] {
  const t = fold(inside)
  const kcal = /(\d+(?:[.,]\d+)?)\s*kcal/.exec(t)
  if (!kcal) return null
  const grab = (re: RegExp) => num(re.exec(t)?.[1]) ?? 0
  return {
    kcal: Math.round(num(kcal[1])!),
    protein_dg: dg(grab(/(?:\bp\b|prot(?:eines?)?)\s*:?\s*(\d+(?:[.,]\d+)?)/)),
    carbs_dg: dg(grab(/(?:\bg\b|gluc(?:ides)?|carbs?)\s*:?\s*(\d+(?:[.,]\d+)?)/)),
    fat_dg: dg(grab(/(?:\bl\b|lip(?:ides)?|fat|gras)\s*:?\s*(\d+(?:[.,]\d+)?)/)),
  }
}

const UNIT = '(kg|g|gr|grammes?|ml|cl|l)'
const toGrams = (n: number, unit: string) =>
  Math.round(n * ({ kg: 1000, l: 1000, cl: 10 }[unit.toLowerCase()] ?? 1))

/**
 * Un élément : « 150 g Saumon », « Saumon 150 g », « 2 Œufs », « Curry de poulet (2 parts) »,
 * « Curry x2 », « Salade composée (450 kcal, P 25, G 30, L 22) ».
 */
export function parseItem(raw: string): MdItem {
  let text = raw
    .trim()
    .replace(/^[-*•]\s*/, '')
    .replace(/\.$/, '')
  let macros: MdItem['macros'] = null
  let grams: number | null = null
  let count: number | null = null

  // parenthèses : valeurs nutritionnelles, quantité ou parts
  text = text.replace(/\(([^)]*)\)/g, (whole, inside: string) => {
    const m = inlineMacros(inside)
    if (m) {
      macros = m
      const g = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${UNIT}\\b`, 'i').exec(
        inside.replace(/\d+(?:[.,]\d+)?\s*kcal/i, ''),
      )
      if (g) grams = toGrams(num(g[1])!, g[2]!)
      return ''
    }
    const parts = /(\d+(?:[.,]\d+)?)\s*parts?/i.exec(inside)
    if (parts) {
      count = num(parts[1])
      return ''
    }
    const q = new RegExp(`^\\s*(\\d+(?:[.,]\\d+)?)\\s*${UNIT}\\s*$`, 'i').exec(inside)
    if (q) {
      grams = toGrams(num(q[1])!, q[2]!)
      return ''
    }
    return whole
  })

  const lead = new RegExp(
    `^(\\d+(?:[.,]\\d+)?)\\s*${UNIT}?\\s+(?:de\\s+|d['’]\\s*)?(.+)$`,
    'i',
  ).exec(text.trim())
  const trail = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*${UNIT}$`, 'i').exec(text.trim())
  const times = /^(.+?)\s*[x×]\s*(\d+(?:[.,]\d+)?)$/i.exec(text.trim())
  if (lead && grams === null && count === null) {
    if (lead[2]) grams = toGrams(num(lead[1])!, lead[2])
    else count = num(lead[1])
    text = lead[3]!
  } else if (trail && grams === null) {
    grams = toGrams(num(trail[2])!, trail[3]!)
    text = trail[1]!
  } else if (times && count === null) {
    count = num(times[2])
    text = times[1]!
  }
  const name = text
    .replace(/\s+/g, ' ')
    .replace(/[,;:]$/, '')
    .trim()
  return { text: raw.trim().replace(/^[-*•]\s*/, ''), name, grams, count, macros }
}

/**
 * Les éléments d'une ligne de repas : séparés par des virgules, « + » ou « ; » (hors parenthèses).
 * Pas « et » : « Pâtes poulet et brocoli » est un seul plat.
 */
export function splitItems(list: string): string[] {
  const out: string[] = []
  let depth = 0
  let current = ''
  for (let i = 0; i < list.length; i++) {
    const c = list[i]!
    if (c === '(') depth++
    if (c === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && (c === ',' || c === '+' || c === ';')) {
      if (current.trim()) out.push(current)
      current = ''
      continue
    }
    current += c
  }
  if (current.trim()) out.push(current)
  return out.map((s) => s.trim()).filter(Boolean)
}

function tableCells(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim())
}

type Section = 'foods' | 'recipes' | 'days' | 'targets' | null

function sectionOf(text: string): Section {
  const t = fold(text)
  if (/aliment|ingredient|base/.test(t)) return 'foods'
  if (/recette|repas types?|plats?/.test(t)) return 'recipes'
  if (/objectif|cible|macro/.test(t) && !/semaine|jour|plan/.test(t)) return 'targets'
  if (/semaine|plan|jours?|menus?|programme/.test(t)) return 'days'
  return null
}

/** Lit le fichier entier. */
export function parseMealPlanMd(md: string): MealPlanMd {
  const result: MealPlanMd = { foods: [], recipes: [], days: [], targets: null, problems: [] }
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  let section: Section = null
  let recipe: MdRecipe | null = null
  let day: MdDay | null = null
  let meal: { meal: Meal; items: MdItem[] } | null = null
  let header: string[] | null = null

  const problem = (n: number, line: string, why: string) =>
    result.problems.push(`Ligne ${n + 1} : ${why} — « ${line.trim().slice(0, 80)} »`)

  lines.forEach((line, n) => {
    const trimmed = line.trim()
    if (!trimmed || /^[-*_]{3,}$/.test(trimmed) || trimmed.startsWith('>')) return
    const h = heading(trimmed)

    if (h) {
      const key = dayKey(h.text)
      const asMeal = mealOf(h.text)
      // un jour peut apparaître sans section « Semaine » au-dessus
      if (key && (section === 'days' || section === null || h.level >= 3)) {
        section = 'days'
        day = { key, label: h.text, meals: [] }
        result.days.push(day)
        meal = null
        recipe = null
        return
      }
      if (asMeal && day && section === 'days') {
        meal = { meal: asMeal, items: [] }
        day.meals.push(meal)
        return
      }
      const s = sectionOf(h.text)
      if (s && h.level <= 2) {
        section = s
        recipe = null
        day = null
        meal = null
        header = null
        return
      }
      if (section === 'recipes') {
        const servings = /\((\d+)\s*parts?\)/i.exec(h.text)
        recipe = {
          name: h.text.replace(/\(\s*\d+\s*parts?\s*\)/i, '').trim(),
          servings: servings ? Number(servings[1]) : 1,
          items: [],
        }
        result.recipes.push(recipe)
        return
      }
      if (s) {
        section = s
        return
      }
      return
    }

    if (section === 'foods' && trimmed.startsWith('|')) {
      const cells = tableCells(trimmed)
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return
      if (!header) {
        header = cells.map((c) => fold(c))
        return
      }
      const col = (re: RegExp) => header!.findIndex((c) => re.test(c))
      const iName = Math.max(0, col(/aliment|nom|ingredient/))
      const value = (re: RegExp) => num(cells[col(re)])
      const kcal = value(/kcal|calorie|energie/)
      const name = cells[iName]?.replace(/\*\*/g, '').trim()
      if (!name || kcal === null) return problem(n, line, 'aliment sans nom ou sans kcal')
      const portion = cells[col(/portion/)] ?? ''
      const portionLabel = /\(([^)]+)\)/.exec(portion)?.[1] ?? null
      result.foods.push({
        name,
        kcal: Math.round(kcal),
        protein_dg: dg(value(/prot/) ?? 0),
        carbs_dg: dg(value(/gluc|carb/) ?? 0),
        fat_dg: dg(value(/lip|gras|fat/) ?? 0),
        portion_g: portion ? num(portion) : null,
        portion_label: portionLabel,
      })
      return
    }

    if (section === 'targets') {
      const t = fold(trimmed)
      const v = num(trimmed)
      if (v === null) return
      result.targets ??= {}
      if (/kcal|calorie/.test(t)) result.targets.kcal = Math.round(v)
      else if (/prot/.test(t)) result.targets.protein_g = Math.round(v)
      else if (/gluc|carb/.test(t)) result.targets.carbs_g = Math.round(v)
      else if (/lip|gras|fat/.test(t)) result.targets.fat_g = Math.round(v)
      return
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed) ?? /^\d+[.)]\s+(.*)$/.exec(trimmed)
    const body = bullet?.[1] ?? null

    if (section === 'recipes' && recipe) {
      if (/^parts?\s*:/i.test(fold(trimmed))) {
        recipe.servings = Math.max(1, Math.round(num(trimmed) ?? 1))
        return
      }
      if (body) recipe.items.push(parseItem(body))
      return
    }

    if (section === 'days' && day) {
      // « - Déjeuner : riz, poulet » ou, sous un titre de repas, « - 150 g de poulet »
      const labelled = /^([^:]{2,30})\s*:\s*(.*)$/.exec(body ?? trimmed)
      const m = labelled ? mealOf(labelled[1]!) : null
      if (labelled && m) {
        meal = { meal: m, items: splitItems(labelled[2]!).map(parseItem) }
        day.meals.push(meal)
        return
      }
      if (body && meal) {
        meal.items.push(...splitItems(body).map(parseItem))
        return
      }
      if (body) problem(n, line, 'repas non reconnu (petit-déjeuner, déjeuner, collation, dîner)')
    }
  })

  for (const d of result.days) d.meals = d.meals.filter((m) => m.items.length > 0)
  result.days = result.days.filter((d) => d.meals.length > 0)
  return result
}

const LABEL: Record<Meal, string> = Object.fromEntries(MEALS.map((m) => [m.id, m.label])) as Record<
  Meal,
  string
>

/** Modèle téléchargeable depuis l'onglet Menu : à remplir à la main ou par un assistant. */
export const MEAL_PLAN_TEMPLATE = `# Plan repas

## Objectifs
- Calories : 2200 kcal
- Protéines : 150 g
- Glucides : 240 g
- Lipides : 70 g

## Aliments
Valeurs pour 100 g (ou 100 ml). La portion sert à écrire « 2 Œufs ».

| Aliment | kcal | Protéines | Glucides | Lipides | Portion |
|---|---|---|---|---|---|
| Flocons d'avoine | 372 | 13,5 | 58,7 | 7 | |
| Lait demi-écrémé | 46 | 3,3 | 4,8 | 1,6 | |
| Banane | 90 | 1,1 | 20 | 0,3 | 120 g (1 banane) |
| Œuf | 140 | 12,5 | 0,7 | 9,8 | 55 g (1 œuf) |
| Poulet (filet cru) | 120 | 22,5 | 0 | 2,6 | |
| Riz basmati (cuit) | 130 | 2,7 | 28 | 0,3 | |
| Saumon | 200 | 20 | 0 | 13 | |

## Recettes
### Porridge banane (1 part)
- 60 g Flocons d'avoine
- 250 ml Lait demi-écrémé
- 1 Banane

### Poulet riz (2 parts)
- 300 g Poulet (filet cru)
- 400 g Riz basmati (cuit)

## Semaine
### Lundi
- ${LABEL.breakfast} : Porridge banane
- ${LABEL.lunch} : Poulet riz (1 part)
- ${LABEL.dinner} : 150 g Saumon, 200 g Riz basmati (cuit)

### Mardi
- ${LABEL.breakfast} : 2 Œufs, 40 g Flocons d'avoine
- ${LABEL.lunch} : Salade composée (520 kcal, P 30, G 40, L 25)
- ${LABEL.dinner} : Poulet riz (1 part)

### Tous les jours
- ${LABEL.snack} : 1 Banane
`
