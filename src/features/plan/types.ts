export type Currency = 'EUR' | 'CAD'
export type LineKind = 'income' | 'expense'

export type PlanSettings = { id: string; eur_to_cad_milli: number }

export type PlanPeriod = {
  id: string
  label: string
  /** Premiers jours du premier et du dernier mois (YYYY-MM-01) */
  start_month: string
  end_month: string
  currency: Currency
  savings_target_cents: number | null
  age_label: string | null
  notes: string | null
  position: number
  created_at: string
}

export type PlanLine = {
  id: string
  period_id: string
  kind: LineKind
  label: string
  monthly_cents: number
  /** Mois actifs dans la période ; null = toute la période */
  first_month: string | null
  last_month: string | null
  category_id: string | null
  position: number
  created_at: string
}

export type PlanBonus = {
  id: string
  period_id: string
  label: string
  planned_cents: number
  expected_month: string | null
  expected_label: string | null
  received_cents: number | null
  received_on: string | null
  income_id: string | null
  position: number
  created_at: string
}

export type PlanEnvelope = {
  id: string
  name: string
  currency: Currency
  savings_id: string | null
  position: number
  created_at: string
}

export type PlanEnvelopeTarget = {
  id: string
  envelope_id: string
  period_id: string
  target_cents: number
}

export type Plan = {
  periods: PlanPeriod[]
  lines: PlanLine[]
  bonuses: PlanBonus[]
  envelopes: PlanEnvelope[]
  targets: PlanEnvelopeTarget[]
}
