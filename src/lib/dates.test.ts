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
