import {
  describeRecurrence,
  firstOccurrence,
  nextOccurrence,
  parseRecurrence,
  serializeRecurrence,
} from './recurrence'

const TODAY = '2026-10-14' // mercredi

describe('sérialisation', () => {
  it('aller-retour', () => {
    for (const v of ['daily', 'monthly', 'weekly:1,3,5'])
      expect(serializeRecurrence(parseRecurrence(v))).toBe(v)
  })
  it('normalise et simplifie', () => {
    expect(serializeRecurrence({ kind: 'weekly', days: [5, 1, 1] })).toBe('weekly:1,5')
    expect(serializeRecurrence({ kind: 'weekly', days: [1, 2, 3, 4, 5, 6, 7] })).toBe('daily')
    expect(serializeRecurrence({ kind: 'weekly', days: [] })).toBeNull()
    expect(parseRecurrence('n importe quoi')).toBeNull()
  })
})

describe('describeRecurrence', () => {
  it.each([
    ['daily', 'Tous les jours'],
    ['monthly', 'Tous les mois'],
    ['weekly:1,2,3,4,5', 'En semaine'],
    ['weekly:6,7', 'Le week-end'],
    ['weekly:1', 'Chaque lundi'],
    ['weekly:1,4', 'Chaque lundi et jeudi'],
    ['weekly:1,3,5', 'Chaque lundi, mercredi et vendredi'],
  ])('%s → %s', (value, label) => {
    expect(describeRecurrence(parseRecurrence(value)!)).toBe(label)
  })
})

describe('occurrences', () => {
  it('quotidienne : demain, même en retard', () => {
    expect(nextOccurrence({ kind: 'daily' }, TODAY, TODAY)).toBe('2026-10-15')
    expect(nextOccurrence({ kind: 'daily' }, '2026-10-01', TODAY)).toBe('2026-10-15')
  })

  it('hebdomadaire : prochain jour prévu', () => {
    const r = { kind: 'weekly' as const, days: [1, 4] } // lundi, jeudi
    expect(nextOccurrence(r, TODAY, TODAY)).toBe('2026-10-15') // jeudi
    expect(nextOccurrence(r, '2026-10-15', TODAY)).toBe('2026-10-19') // lundi
  })

  it('mensuelle : même jour, borné aux mois courts, ancré sur le jour d’origine', () => {
    const r = { kind: 'monthly' as const }
    expect(nextOccurrence(r, '2026-10-14', TODAY)).toBe('2026-11-14')
    expect(nextOccurrence(r, '2027-01-31', '2027-01-31')).toBe('2027-02-28')
    expect(nextOccurrence(r, '2026-08-31', TODAY)).toBe('2026-10-31')
  })

  it('anticipée : une occurrence future avance d’un cran', () => {
    expect(nextOccurrence({ kind: 'daily' }, '2026-10-20', TODAY)).toBe('2026-10-21')
  })

  it('première occurrence', () => {
    expect(firstOccurrence({ kind: 'daily' }, TODAY)).toBe(TODAY)
    expect(firstOccurrence({ kind: 'weekly', days: [3] }, TODAY)).toBe(TODAY)
    expect(firstOccurrence({ kind: 'weekly', days: [1] }, TODAY)).toBe('2026-10-19')
  })
})
