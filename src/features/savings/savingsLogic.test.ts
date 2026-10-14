import { balanceOf, byMoveDateDesc, savedInMonth, savingsRatio } from './savingsLogic'
import type { SavingsMove } from './types'

const move = (over: Partial<SavingsMove>): SavingsMove => ({
  id: 'm',
  savings_id: 's1',
  amount_cents: 0,
  moved_on: '2026-10-01',
  note: null,
  created_at: '2026-10-01T00:00:00Z',
  ...over,
})

const moves = [
  move({ id: 'a', amount_cents: 50000, moved_on: '2026-09-28' }),
  move({ id: 'b', amount_cents: 20000, moved_on: '2026-10-02' }),
  move({ id: 'c', amount_cents: -5000, moved_on: '2026-10-10' }),
  move({ id: 'd', savings_id: 's2', amount_cents: 10000, moved_on: '2026-10-05' }),
]

describe('savingsLogic', () => {
  it('calcule le solde d’une cagnotte (versements − retraits)', () => {
    expect(balanceOf(moves, 's1')).toBe(65000)
    expect(balanceOf(moves, 's2')).toBe(10000)
    expect(balanceOf(moves, 'autre')).toBe(0)
  })

  it('calcule l’épargne nette du mois, toutes cagnottes confondues', () => {
    expect(savedInMonth(moves, '2026-10')).toBe(25000)
    expect(savedInMonth(moves, '2026-09')).toBe(50000)
    expect(savedInMonth(moves, '2026-11')).toBe(0)
  })

  it('borne l’avancement entre 0 et 1', () => {
    expect(savingsRatio(50000, 100000)).toBe(0.5)
    expect(savingsRatio(150000, 100000)).toBe(1)
    expect(savingsRatio(-100, 100000)).toBe(0)
  })

  it('trie les mouvements du plus récent au plus ancien', () => {
    expect([...moves].sort(byMoveDateDesc).map((m) => m.id)).toEqual(['c', 'd', 'b', 'a'])
  })
})
