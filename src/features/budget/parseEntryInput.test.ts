import { parseEntryInput } from './parseEntryInput'
import type { Category } from './types'

const TODAY = '2026-10-14' // mercredi
const cat = (id: string, name: string, archived = false): Category => ({
  id,
  name,
  color: null,
  monthly_budget_cents: null,
  position: 0,
  archived,
})
const categories = [
  cat('c1', 'Courses'),
  cat('c2', 'Restaurants'),
  cat('c3', 'Transport'),
  cat('c4', 'Santé'),
  cat('c5', 'Vieux', true),
]
const parse = (text: string) => parseEntryInput(text, categories, TODAY)

describe('parseEntryInput', () => {
  it('montant + catégorie par mot-clé, sans note superflue', () => {
    expect(parse('12,50 resto')).toEqual({
      kind: 'expense',
      amount_cents: 1250,
      category_id: 'c2',
      spent_on: null,
      note: null,
    })
  })

  it('date passée et note conservée', () => {
    expect(parse('132 dîner entre amis hier')).toEqual({
      kind: 'expense',
      amount_cents: 13200,
      category_id: 'c2',
      spent_on: '2026-10-13',
      note: 'dîner entre amis',
    })
  })

  it('nom de catégorie, symbole euro et accents', () => {
    expect(parse('8€ pharmacie samedi')).toMatchObject({
      amount_cents: 800,
      category_id: 'c4',
      spent_on: '2026-10-10',
    })
    expect(parse('45 courses')).toMatchObject({ category_id: 'c1', note: null })
  })

  it('« + » en tête = revenu, sans catégorie', () => {
    expect(parse('+2400 salaire')).toEqual({
      kind: 'income',
      amount_cents: 240000,
      category_id: null,
      spent_on: null,
      note: 'salaire',
    })
  })

  it('montant seul, ou absent', () => {
    expect(parse('19.99')).toMatchObject({ amount_cents: 1999, note: null })
    expect(parse('cadeau').amount_cents).toBeNull()
  })

  it('ignore les catégories archivées', () => {
    expect(parse('10 vieux').category_id).toBeNull()
  })

  it('espace = séparateur de milliers seulement (pas de confusion avec une date)', () => {
    expect(parse('1 234,56 loyer')).toMatchObject({ amount_cents: 123456 })
    expect(parse('45 15/11 courses')).toMatchObject({
      amount_cents: 4500,
      spent_on: '2025-11-15',
      category_id: 'c1',
    })
  })
})
