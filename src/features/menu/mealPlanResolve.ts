import { addDays } from '@/lib/dates'
import type { CatalogFood } from './catalog'
import type { MdFood, MdItem, MealPlanMd } from './mealPlanMd'
import { baseName, normalizeName, scaleMacros, searchFoods } from './nutrition'
import { forParts, recipeTotals } from './recipeLogic'
import type {
  Food,
  FoodPatch,
  MacroTargets,
  MealItem,
  Recipe,
  RecipeFull,
  RecipeItem,
} from './types'

export type ResolvedPlan = {
  /** Aliments à créer : ceux du fichier, ou copiés de la base d'aliments courants */
  newFoods: Food[]
  /** Aliments déjà là dont le fichier donne d'autres valeurs */
  updatedFoods: { id: string; name: string; patch: FoodPatch }[]
  /** Recettes du fichier ; une recette de même nom garde son id et voit ses ingrédients remplacés */
  recipes: { recipe: Recipe; items: RecipeItem[]; replaces: RecipeItem[] | null }[]
  mealItems: MealItem[]
  /** Jours où des repas seront posés */
  days: string[]
  targets: Partial<MacroTargets> | null
  /** Rapprochements à vérifier : « Œufs → Œuf (base d'aliments) » */
  notes: string[]
  /** Ce qui ne pourra pas être importé */
  problems: string[]
}

type Values = Pick<Food, 'kcal' | 'protein_dg' | 'carbs_dg' | 'fat_dg'>

const sameValues = (a: Values, b: Values) =>
  a.kcal === b.kcal &&
  a.protein_dg === b.protein_dg &&
  a.carbs_dg === b.carbs_dg &&
  a.fat_dg === b.fat_dg

const keyOf = (name: string) => normalizeName(name)
const matches = (candidate: string, wanted: string) =>
  keyOf(candidate) === keyOf(wanted) || keyOf(baseName(candidate)) === keyOf(wanted)

/**
 * Transforme le fichier lu en lignes prêtes à écrire, sur `weeks` semaines à partir du lundi
 * `monday` (les jours de la semaine se répètent ; une date précise ne sert qu'une fois).
 * Aliments cherchés dans le fichier, puis dans « Mes aliments », puis dans la base courante.
 */
export function resolveMealPlan(
  md: MealPlanMd,
  ctx: { foods: Food[]; recipes: RecipeFull[]; catalog: CatalogFood[] },
  options: {
    monday: string
    weeks: number
    /**
     * Type de chaque semaine (« A », « B »… ; null = aucun) pour les jours rattachés à un type ;
     * les jours sans type ont lieu toutes les semaines.
     */
    weekTypes?: (string | null)[]
    /** Plan d'origine des repas posés */
    planId?: string
    /** Ne pose rien avant ce jour (on ne réécrit pas les jours passés) */
    fromDay?: string
  },
): ResolvedPlan {
  const now = new Date().toISOString()
  const id = () => crypto.randomUUID()
  const out: ResolvedPlan = {
    newFoods: [],
    updatedFoods: [],
    recipes: [],
    mealItems: [],
    days: [],
    targets: md.targets,
    notes: [],
    problems: [...md.problems],
  }

  const known = new Map<string, Food | null>()
  const toFood = (f: MdFood | CatalogFood): Food => ({ id: id(), created_at: now, ...f })

  // 1. Les aliments du fichier : créés, ou mis à jour s'ils existent avec d'autres valeurs
  for (const f of md.foods) {
    const mine = ctx.foods.find((x) => matches(x.name, f.name) || matches(f.name, x.name))
    if (!mine) {
      const food = toFood(f)
      out.newFoods.push(food)
      known.set(keyOf(f.name), food)
      continue
    }
    if (!sameValues(mine, f) || (f.portion_g !== null && f.portion_g !== mine.portion_g)) {
      const patch: FoodPatch = {
        kcal: f.kcal,
        protein_dg: f.protein_dg,
        carbs_dg: f.carbs_dg,
        fat_dg: f.fat_dg,
        ...(f.portion_g !== null ? { portion_g: f.portion_g, portion_label: f.portion_label } : {}),
      }
      out.updatedFoods.push({ id: mine.id, name: mine.name, patch })
      known.set(keyOf(f.name), { ...mine, ...patch })
    } else known.set(keyOf(f.name), mine)
  }

  function findFood(name: string): Food | null {
    const k = keyOf(name)
    if (known.has(k)) return known.get(k)!
    const pool = [...out.newFoods, ...ctx.foods]
    let food: Food | null =
      pool.find((f) => matches(f.name, name)) ?? known.get(keyOf(baseName(name))) ?? null
    if (!food) {
      const exact = ctx.catalog.find((c) => matches(c.name, name))
      if (exact) {
        food = toFood(exact)
        out.newFoods.push(food)
      } else {
        const best = searchFoods(name, pool, ctx.catalog, 1)[0]
        if (best) {
          food = best.kind === 'food' ? best.food : toFood(best.food)
          if (best.kind === 'catalog') out.newFoods.push(food)
          out.notes.push(
            `« ${name} » → ${food.name}${best.kind === 'catalog' ? ' (base d’aliments)' : ''}`,
          )
        }
      }
    }
    known.set(k, food)
    return food
  }

  /** Grammes et valeurs d'un élément fait d'un aliment. */
  function foodValues(item: MdItem, where: string) {
    const food = findFood(item.name)
    if (!food) {
      out.problems.push(
        `${where} : aliment inconnu « ${item.name} » (ajoutez-le au tableau des aliments)`,
      )
      return null
    }
    let grams = item.grams
    if (grams === null) {
      const portion = food.portion_g ?? 100
      if (item.count !== null && food.portion_g === null)
        out.notes.push(
          `« ${item.text} » : pas de portion connue pour ${food.name}, compté ${item.count} × 100 g`,
        )
      grams = Math.max(1, Math.round((item.count ?? 1) * portion))
    }
    return { food, grams, ...scaleMacros(food, grams) }
  }

  // 2. Les recettes du fichier (une recette de même nom est remplacée, pas dupliquée)
  const recipesByKey = new Map<string, RecipeFull>(ctx.recipes.map((r) => [keyOf(r.name), r]))
  for (const r of md.recipes) {
    const existing = ctx.recipes.find((x) => keyOf(x.name) === keyOf(r.name))
    const recipe: Recipe = {
      id: existing?.id ?? id(),
      name: existing?.name ?? r.name,
      servings: Math.max(1, Math.min(50, r.servings)),
      created_at: existing?.created_at ?? now,
    }
    const items: RecipeItem[] = []
    r.items.forEach((it, position) => {
      const v = it.macros
        ? { food: null, grams: it.grams ?? 100, ...it.macros }
        : foodValues(it, `Recette « ${r.name} »`)
      if (!v) return
      items.push({
        id: id(),
        recipe_id: recipe.id,
        food_id: v.food?.id ?? null,
        name: v.food?.name ?? it.name,
        grams: v.grams,
        kcal: v.kcal,
        protein_dg: v.protein_dg,
        carbs_dg: v.carbs_dg,
        fat_dg: v.fat_dg,
        position,
        created_at: now,
      })
    })
    if (items.length === 0) {
      out.problems.push(`Recette « ${r.name} » : aucun ingrédient compris`)
      continue
    }
    out.recipes.push({ recipe, items, replaces: existing ? existing.items : null })
    recipesByKey.set(keyOf(r.name), { ...recipe, items })
  }

  // 3. Les repas, jour par jour
  const dates = (key: MealPlanMd['days'][number]['key'], cycle: string | null): string[] => {
    if (key.kind === 'date') return [key.date]
    const weeks = Array.from({ length: options.weeks }, (_, w) => w)
      .filter((w) => cycle === null || options.weekTypes?.[w] === cycle)
      .map((w) => addDays(options.monday, 7 * w))
    if (key.kind === 'every')
      return weeks.flatMap((m) => Array.from({ length: 7 }, (_, i) => addDays(m, i)))
    return weeks.map((m) => addDays(m, key.weekday - 1))
  }
  const positions = new Map<string, number>()
  const unresolved = new Set<string>()
  for (const d of md.days) {
    for (const { meal, items } of d.meals) {
      for (const it of items) {
        // une recette (du fichier ou de l'app), des valeurs données sur la ligne, ou un aliment
        const recipe = !it.macros ? (recipesByKey.get(keyOf(it.name)) ?? null) : null
        let values: Omit<
          MealItem,
          'id' | 'day' | 'meal' | 'position' | 'created_at' | 'plan_id' | 'eaten'
        >
        if (recipe) {
          const perPart = recipeTotals(recipe.items).grams / recipe.servings
          const parts =
            it.count ??
            (it.grams !== null && perPart > 0 ? Math.round((it.grams / perPart) * 4) / 4 : 1)
          values = {
            food_id: null,
            recipe_id: recipe.id,
            name: recipe.name,
            ...forParts(recipe, parts),
          }
        } else if (it.macros) {
          values = {
            food_id: null,
            recipe_id: null,
            name: it.name,
            grams: it.grams ?? 100,
            ...it.macros,
          }
        } else {
          const where = `${d.label}, ${it.name}`
          if (unresolved.has(keyOf(it.name))) continue
          const v = foodValues(it, where)
          if (!v) {
            unresolved.add(keyOf(it.name))
            continue
          }
          values = {
            food_id: v.food.id,
            recipe_id: null,
            name: v.food.name,
            grams: v.grams,
            kcal: v.kcal,
            protein_dg: v.protein_dg,
            carbs_dg: v.carbs_dg,
            fat_dg: v.fat_dg,
          }
        }
        for (const day of dates(d.key, d.cycle)) {
          if (options.fromDay && day < options.fromDay) continue
          const slot = `${day}|${meal}`
          const position = positions.get(slot) ?? 0
          positions.set(slot, position + 1)
          out.mealItems.push({
            id: id(),
            day,
            meal,
            position,
            created_at: now,
            plan_id: options.planId ?? null,
            eaten: false,
            ...values,
          })
        }
      }
    }
  }
  out.days = [...new Set(out.mealItems.map((m) => m.day))].sort()
  return out
}
