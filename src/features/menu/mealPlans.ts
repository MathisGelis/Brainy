import { addDays } from '@/lib/dates'
import type { CatalogFood } from './catalog'
import { writeMealPlan } from './mealPlanImport'
import { parseMealPlanMd, type MealPlanMd } from './mealPlanMd'
import { resolveMealPlan, type ResolvedPlan } from './mealPlanResolve'
import {
  fetchMealItems,
  insertMealPlan,
  removeMealItems,
  removePlanWeek,
  upsertPlanWeek,
} from './menuApi'
import type { Food, MacroTargets, MealItem, MealPlan, RecipeFull } from './types'

type Ctx = { foods: Food[]; recipes: RecipeFull[]; catalog: CatalogFood[] }

/** Types de semaine d'un plan (« A », « B »…), triés ; vide si toutes ses semaines se ressemblent. */
export function planTypes(md: MealPlanMd): string[] {
  return [...new Set(md.days.map((d) => d.cycle).filter((c): c is string => c !== null))].sort()
}

/** Valeur d'un choix de semaine : « idDuPlan:A », « idDuPlan: » (sans type) ou '' (aucun plan). */
export const choiceValue = (planId: string, weekType: string | null) =>
  `${planId}:${weekType ?? ''}`

export function parseChoice(value: string): { planId: string; weekType: string | null } | null {
  if (!value) return null
  const i = value.lastIndexOf(':')
  return { planId: value.slice(0, i), weekType: value.slice(i + 1) || null }
}

/** Ce que le fichier apporte une fois pour toutes : aliments, recettes, objectifs (pas les repas). */
export function resolvePlanLibrary(md: MealPlanMd, ctx: Ctx): ResolvedPlan {
  return resolveMealPlan({ ...md, days: [] }, ctx, { monday: '2000-01-03', weeks: 0 })
}

/**
 * Aperçu d'un fichier : aliments, recettes, objectifs, et les repas de chacun de ses types de
 * semaine (pour signaler les aliments inconnus partout).
 */
export function previewPlan(md: MealPlanMd, ctx: Ctx, monday: string): ResolvedPlan {
  const types = planTypes(md)
  const plan = resolveMealPlan(md, ctx, {
    monday,
    weeks: Math.max(1, types.length),
    weekTypes: types.length > 0 ? types : undefined,
  })
  return { ...plan, notes: [...repeatedDays(md), ...plan.notes] }
}

/**
 * Jours décrits deux fois pour les mêmes semaines : leurs repas s'additionnent (deux petits-déjeuners…),
 * souvent le signe d'un titre de semaine non reconnu.
 */
export function repeatedDays(md: MealPlanMd): string[] {
  const seen = new Map<string, { label: string; count: number }>()
  for (const d of md.days) {
    const key = `${d.cycle ?? ''}|${d.key.kind === 'weekday' ? d.key.weekday : d.key.kind === 'date' ? d.key.date : 'every'}`
    const s = seen.get(key)
    if (s) s.count += 1
    else seen.set(key, { label: d.label, count: 1 })
  }
  return [...seen.values()]
    .filter((s) => s.count > 1)
    .map(
      (s) =>
        `« ${s.label} » est décrit ${s.count} fois pour les mêmes semaines : ses repas s’additionnent. Pour des semaines différentes, titrez-les « ## Semaine A », « ## Semaine B »…`,
    )
}

/**
 * Ce qui change dans une semaine qui reçoit un plan (ou aucun), à partir de `fromDay` :
 * les repas posés par un plan et pas encore mangés partent ; les ajouts à la main et les repas
 * mangés restent, et un repas déjà mangé n'est pas reposé (pas de déjeuner en double).
 */
export function planWeekChanges(
  existing: MealItem[],
  planned: MealItem[],
  fromDay: string,
  sunday: string,
): { removeIds: string[]; add: MealItem[] } {
  const removed = (m: MealItem) => m.plan_id !== null && !m.eaten && m.day >= fromDay
  const kept = existing.filter((m) => !removed(m))
  const slot = (m: Pick<MealItem, 'day' | 'meal'>) => `${m.day}|${m.meal}`
  const eatenSlots = new Set(kept.filter((m) => m.eaten).map(slot))
  const next = new Map<string, number>()
  for (const m of kept) next.set(slot(m), Math.max(next.get(slot(m)) ?? 0, m.position + 1))
  const add: MealItem[] = []
  for (const m of planned) {
    if (m.day < fromDay || m.day > sunday || eatenSlots.has(slot(m))) continue
    const position = next.get(slot(m)) ?? 0
    next.set(slot(m), position + 1)
    add.push({ ...m, position })
  }
  return { removeIds: existing.filter(removed).map((m) => m.id), add }
}

/** Ajoute un fichier aux plans : ses aliments, recettes et objectifs sont écrits tout de suite. */
export async function savePlanFile(
  file: { name: string; content: string },
  ctx: Ctx,
  currentTargets: MacroTargets,
): Promise<MealPlan> {
  const md = parseMealPlanMd(file.content)
  await writeMealPlan(resolvePlanLibrary(md, ctx), { replace: false, currentTargets })
  const plan: MealPlan = {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 80) || 'Plan',
    content: file.content,
    created_at: new Date().toISOString(),
  }
  await insertMealPlan(plan)
  return plan
}

/**
 * Donne un plan (et un type de semaine) à la semaine du lundi `monday`, ou aucun plan :
 * rien n'est touché avant aujourd'hui. Renvoie le nombre de repas posés et ce qui n'a pas été compris.
 */
export async function applyPlanWeek(args: {
  monday: string
  plan: MealPlan | null
  weekType: string | null
  ctx: Ctx
  today: string
}): Promise<{ added: number; problems: string[] }> {
  const { monday, plan, weekType, ctx, today } = args
  const sunday = addDays(monday, 6)
  const fromDay = monday > today ? monday : today
  let resolved: ResolvedPlan | null = null
  if (plan) {
    // aliments et recettes du fichier déjà écrits à l'ajout : on ne pose que les repas
    const md = parseMealPlanMd(plan.content)
    resolved = resolveMealPlan(
      { ...md, foods: [], recipes: [], targets: null, problems: [] },
      ctx,
      {
        monday,
        weeks: 1,
        weekTypes: [weekType],
        planId: plan.id,
        fromDay,
      },
    )
  }
  if (sunday >= today) {
    const existing = await fetchMealItems(monday, sunday)
    const { removeIds, add } = planWeekChanges(existing, resolved?.mealItems ?? [], fromDay, sunday)
    await removeMealItems(removeIds)
    if (resolved) {
      await writeMealPlan(
        { ...resolved, recipes: [], updatedFoods: [], mealItems: add, targets: null },
        {
          replace: false,
          currentTargets: { kcal: null, protein_g: null, carbs_g: null, fat_g: null },
        },
      )
    }
    if (plan) {
      await upsertPlanWeek({
        id: crypto.randomUUID(),
        monday,
        plan_id: plan.id,
        week_type: weekType,
        created_at: new Date().toISOString(),
      })
    } else await removePlanWeek(monday)
    return { added: add.length, problems: resolved?.problems ?? [] }
  }
  return { added: 0, problems: [] }
}
