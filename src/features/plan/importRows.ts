import type { Goal } from '@/features/goals/types'
import type { SavingsGoal } from '@/features/savings/types'
import { fold } from '@/lib/naturalDate'
import { matchEnvelope, type PlanImport } from './importPlan'
import type { PlanBonus, PlanEnvelope, PlanEnvelopeTarget, PlanLine, PlanPeriod } from './types'

export type ImportRows = {
  periods: PlanPeriod[]
  lines: PlanLine[]
  bonuses: PlanBonus[]
  envelopes: PlanEnvelope[]
  targets: PlanEnvelopeTarget[]
  /** Cagnottes créées pour les enveloppes en euros qui n'en ont pas encore */
  savings: SavingsGoal[]
  /** Objectifs clés absents de l'onglet Objectifs (même titre = déjà là) */
  goals: Goal[]
}

const horizonOf = (target: string | null, today: string): Goal['horizon'] => {
  if (!target) return 'long'
  const months =
    (Number(target.slice(0, 4)) - Number(today.slice(0, 4))) * 12 +
    Number(target.slice(5, 7)) -
    Number(today.slice(5, 7))
  return months < 3 ? 'short' : months <= 12 ? 'medium' : 'long'
}

/**
 * Lignes à écrire pour un classeur lu : ids créés ici (les liens entre tables tiennent avant
 * l'envoi), enveloppes reliées aux cagnottes de même nom, objectifs déjà présents ignorés.
 */
export function importRows(
  plan: PlanImport,
  existing: { savings: SavingsGoal[]; goals: Goal[]; savingsCount: number },
  options: { createSavings: boolean; today: string },
): ImportRows {
  const now = new Date().toISOString()
  const id = () => crypto.randomUUID()
  const rows: ImportRows = {
    periods: [],
    lines: [],
    bonuses: [],
    envelopes: [],
    targets: [],
    savings: [],
    goals: [],
  }

  const envelopeIds = new Map<string, string>()
  plan.envelopes.forEach((e, position) => {
    const maxTarget = Math.max(
      0,
      ...plan.periods.flatMap((p) =>
        p.envelopes.filter((x) => x.name === e.name).map((x) => x.target_cents),
      ),
    )
    let savings = matchEnvelope(
      e.name,
      existing.savings.filter((s) => !s.archived),
    )
    // seules les enveloppes en euros d'épargne réelle (un objectif > 0) deviennent des cagnottes
    if (!savings && options.createSavings && e.currency === 'EUR' && maxTarget > 0) {
      savings = {
        id: id(),
        name: e.name,
        target_cents: maxTarget,
        goal_id: null,
        archived: false,
        position: existing.savingsCount + rows.savings.length,
        created_at: now,
      }
      rows.savings.push(savings)
    }
    const envelope: PlanEnvelope = {
      id: id(),
      name: e.name,
      currency: e.currency,
      savings_id: savings?.id ?? null,
      position,
      created_at: now,
    }
    envelopeIds.set(e.name, envelope.id)
    rows.envelopes.push(envelope)
  })

  plan.periods.forEach((p, position) => {
    const periodId = id()
    rows.periods.push({
      id: periodId,
      label: p.label,
      start_month: p.start_month,
      end_month: p.end_month,
      currency: p.currency,
      savings_target_cents: p.savings_target_cents,
      age_label: p.age_label,
      notes: p.notes,
      position,
      created_at: now,
    })
    p.lines.forEach((l, i) =>
      rows.lines.push({
        id: id(),
        period_id: periodId,
        category_id: null,
        position: i,
        created_at: now,
        ...l,
      }),
    )
    p.bonuses.forEach((b, i) =>
      rows.bonuses.push({
        id: id(),
        period_id: periodId,
        income_id: null,
        position: i,
        created_at: now,
        ...b,
      }),
    )
    const seen = new Set<string>()
    for (const e of p.envelopes) {
      const envelopeId = envelopeIds.get(e.name)
      // deux lignes rattachées à la même enveloppe : la première compte
      if (!envelopeId || seen.has(envelopeId)) continue
      seen.add(envelopeId)
      rows.targets.push({
        id: id(),
        envelope_id: envelopeId,
        period_id: periodId,
        target_cents: e.target_cents,
      })
    }
  })

  const titles = new Set(existing.goals.map((g) => fold(g.title.trim())))
  for (const g of plan.goals) {
    if (titles.has(fold(g.title.trim()))) continue
    rows.goals.push({
      id: id(),
      title: g.title,
      description: g.description,
      horizon: horizonOf(g.target_date, options.today),
      target_date: g.target_date,
      status: g.achieved ? 'achieved' : 'active',
      created_at: now,
      updated_at: now,
    })
  }
  return rows
}
