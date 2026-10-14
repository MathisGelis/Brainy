import { buildGuessIndex, guessCategory } from './categoryGuess'
import type { Category, Expense } from './types'

const cat = (id: string, name: string, archived = false): Category => ({
  id,
  name,
  color: null,
  monthly_budget_cents: null,
  position: 0,
  archived,
})
const categories = [
  cat('courses', 'Courses'),
  cat('resto', 'Restaurants'),
  cat('transport', 'Transport'),
  cat('old', 'Ancienne', true),
]

let n = 0
const expense = (note: string | null, category_id: string | null): Expense => ({
  id: `e${n++}`,
  category_id,
  amount_cents: 1000,
  spent_on: '2026-10-01',
  note,
  recurring_id: null,
  created_at: '',
})

const index = buildGuessIndex(
  [
    expense('Carrefour', 'courses'),
    expense('Carrefour City', 'courses'),
    expense('carrefour', 'courses'),
    expense('Carrefour', 'resto'), // une erreur passée ne renverse pas l'habitude
    expense('Pizza Mario', 'resto'),
    expense('Pizza Mario', 'resto'),
    expense('Pizza surgelée', 'courses'),
    expense('Navigo octobre', 'transport'),
    expense('Brocante', 'old'), // catégorie archivée : ignorée
    expense(null, 'courses'),
    expense('Sans catégorie', null),
  ],
  categories,
)

describe('guessCategory', () => {
  it('reconnaît une note déjà vue, sans tenir compte des accents ni de la casse', () => {
    expect(guessCategory(index, 'CARREFOUR')).toBe('courses')
    expect(guessCategory(index, 'pizza mario')).toBe('resto')
  })

  it('s’appuie sur les mots quand la note complète est nouvelle', () => {
    expect(guessCategory(index, 'courses carrefour market')).toBe('courses')
    expect(guessCategory(index, 'Navigo novembre')).toBe('transport')
  })

  it('devine pendant la frappe (début de mot connu)', () => {
    expect(guessCategory(index, 'carref')).toBe('courses')
  })

  it('reste muet quand l’historique est partagé ou absent', () => {
    expect(guessCategory(index, 'pizza')).toBeNull() // 2 resto, 1 courses : pas assez net
    expect(guessCategory(index, 'cinéma')).toBeNull()
    expect(guessCategory(index, 'brocante')).toBeNull()
    expect(guessCategory(index, null)).toBeNull()
    expect(guessCategory(index, 'de la')).toBeNull()
  })
})
