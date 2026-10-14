import { todayISO } from './dates'

describe('todayISO', () => {
  it('formate en YYYY-MM-DD', () => {
    expect(todayISO(new Date('2026-03-10T12:00:00Z'))).toBe('2026-03-10')
  })

  it('utilise le fuseau Europe/Paris (minuit passé à Paris)', () => {
    // 23:30 UTC le 10 mars = 00:30 le 11 mars à Paris (UTC+1)
    expect(todayISO(new Date('2026-03-10T23:30:00Z'))).toBe('2026-03-11')
  })
})

import { addDays, addMonths, formatMonthLabel, lastNDays, monthBounds, startOfWeek } from './dates'

describe('calculs de dates', () => {
  it('ajoute des jours à travers un changement de mois et d’heure', () => {
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30') // passage à l'heure d'été
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('renvoie les n derniers jours, le plus ancien en premier', () => {
    expect(lastNDays('2026-03-10', 3)).toEqual(['2026-03-08', '2026-03-09', '2026-03-10'])
  })

  it('trouve le lundi de la semaine', () => {
    expect(startOfWeek('2026-03-10')).toBe('2026-03-09') // mardi
    expect(startOfWeek('2026-03-15')).toBe('2026-03-09') // dimanche
    expect(startOfWeek('2026-03-09')).toBe('2026-03-09')
  })

  it('navigue entre les mois', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(monthBounds('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' })
    expect(formatMonthLabel('2026-03')).toBe('mars 2026')
  })
})
