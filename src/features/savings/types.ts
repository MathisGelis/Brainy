/** Cagnotte d'épargne : un montant cible, alimenté par des versements (et parfois des retraits). */
export type SavingsGoal = {
  id: string
  name: string
  target_cents: number
  /** Objectif (onglet Objectifs) que la cagnotte sert, le cas échéant */
  goal_id: string | null
  archived: boolean
  position: number
  created_at: string
}

export type SavingsPatch = Partial<
  Pick<SavingsGoal, 'name' | 'target_cents' | 'goal_id' | 'archived'>
>

/** Versement (montant > 0) ou retrait (montant < 0). */
export type SavingsMove = {
  id: string
  savings_id: string
  amount_cents: number
  moved_on: string
  note: string | null
  created_at: string
}

export type MovePatch = Partial<Pick<SavingsMove, 'amount_cents' | 'moved_on' | 'note'>>
