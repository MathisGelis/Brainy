import { monthBounds } from '@/lib/dates'
import type { SavingsMove } from './types'

/** Solde d'une cagnotte : somme de ses versements et retraits. */
export function balanceOf(moves: SavingsMove[], savingsId: string): number {
  return moves.reduce((sum, m) => (m.savings_id === savingsId ? sum + m.amount_cents : sum), 0)
}

/** Épargne nette du mois `YYYY-MM` (versements − retraits), toutes cagnottes confondues. */
export function savedInMonth(moves: SavingsMove[], month: string): number {
  const { from, to } = monthBounds(month)
  return moves.reduce(
    (sum, m) => (m.moved_on >= from && m.moved_on < to ? sum + m.amount_cents : sum),
    0,
  )
}

/** Avancement vers la cible, entre 0 et 1. */
export function savingsRatio(balance: number, target: number): number {
  return target <= 0 ? 0 : Math.max(0, Math.min(1, balance / target))
}

/** Plus récents d'abord. */
export function byMoveDateDesc(a: SavingsMove, b: SavingsMove): number {
  return b.moved_on.localeCompare(a.moved_on) || b.created_at.localeCompare(a.created_at)
}
