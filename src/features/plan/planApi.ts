import { insertGoal, insertMilestones } from '@/features/goals/goalsApi'
import { insertSavings } from '@/features/savings/savingsApi'
import { supabase } from '@/lib/supabase'
import type { ImportRows } from './importRows'
import type { Plan, PlanBonus, PlanEnvelope, PlanLine, PlanPeriod, PlanSettings } from './types'

// `user_id` est rempli côté base (default auth.uid()) et protégé par la RLS.

async function all<T>(table: string, order = 'position'): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*').order(order).order('id')
  if (error) throw error
  return data as T[]
}

export async function fetchPlan(): Promise<Plan> {
  const [periods, lines, bonuses, envelopes, targets] = await Promise.all([
    all<PlanPeriod>('plan_periods', 'start_month'),
    all<PlanLine>('plan_lines'),
    all<PlanBonus>('plan_bonuses'),
    all<PlanEnvelope>('plan_envelopes'),
    all<Plan['targets'][number]>('plan_envelope_targets', 'period_id'),
  ])
  return { periods, lines, bonuses, envelopes, targets }
}

export async function fetchPlanSettings(): Promise<PlanSettings | null> {
  const { data, error } = await supabase
    .from('plan_settings')
    .select('id, eur_to_cad_milli')
    .maybeSingle()
  if (error) throw error
  return data as PlanSettings | null
}

/** Une ligne par utilisateur : crée ou remplace le taux. */
export async function upsertPlanSettings(eur_to_cad_milli: number): Promise<void> {
  const { error } = await supabase
    .from('plan_settings')
    .upsert({ eur_to_cad_milli }, { onConflict: 'user_id' })
  if (error) throw error
}

async function insert(table: string, rows: object[]) {
  if (rows.length === 0) return
  const { error } = await supabase.from(table).insert(rows)
  if (error) throw error
}

/** Remplace tout le plan (les postes, primes et cibles partent avec leurs périodes). */
export async function replacePlan(rows: ImportRows): Promise<void> {
  for (const table of ['plan_periods', 'plan_envelopes']) {
    // filtre toujours vrai : PostgREST refuse un delete sans filtre ; la RLS limite à ses lignes
    const { error } = await supabase.from(table).delete().not('id', 'is', null)
    if (error) throw error
  }
  for (const s of rows.savings) await insertSavings(s)
  for (const g of rows.goals) await insertGoal(g)
  await insertMilestones(rows.milestones)
  await insert('plan_periods', rows.periods)
  await insert('plan_envelopes', rows.envelopes)
  await insert('plan_lines', rows.lines)
  await insert('plan_bonuses', rows.bonuses)
  await insert('plan_envelope_targets', rows.targets)
}

export async function patchRow(
  table: 'plan_lines' | 'plan_bonuses' | 'plan_envelopes' | 'plan_periods',
  id: string,
  patch: object,
): Promise<void> {
  const { error } = await supabase.from(table).update(patch).eq('id', id)
  if (error) throw error
}
