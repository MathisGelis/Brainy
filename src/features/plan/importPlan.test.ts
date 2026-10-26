import { readXlsx } from '@/lib/xlsx'
import { planFixture } from './__fixtures__/fixture'
import {
  monthNumber,
  parseDeadline,
  parseMonthYear,
  parsePlanWorkbook,
  PlanImportError,
  matchEnvelope,
  sameEnvelope,
} from './importPlan'

describe('petits analyseurs', () => {
  it('reconnaît les mois abrégés ou non, avec ou sans accents', () => {
    expect(
      ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map(
        monthNumber,
      ),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(monthNumber('juin')).toBe(6)
    expect(monthNumber('juillet')).toBe(7)
    expect(monthNumber('Notes')).toBeNull()
  })

  it('lit un mois attendu et une échéance', () => {
    expect(parseMonthYear('Décembre 2026')).toBe('2026-12-01')
    expect(parseMonthYear("Début d'année")).toBeNull()
    expect(parseDeadline('Nov 2026')).toBe('2026-11-30')
    expect(parseDeadline('2029-2030')).toBe('2030-12-31')
    expect(parseDeadline('Jour J')).toBeNull()
  })

  it('rapproche les noms d’enveloppes sans confondre CELI et CELIAPP', () => {
    expect(sameEnvelope('Livret A', 'Livret A / Matelas €')).toBe(true)
    expect(sameEnvelope('Assurance-vie CNP', 'Assurance-vie')).toBe(true)
    expect(sameEnvelope('CELIAPP', 'CELI — ETF')).toBe(false)
    expect(sameEnvelope('CELI — ETF', 'CELI — ETF')).toBe(true)
    const known = [{ name: 'Livret A / Matelas €' }, { name: 'CELIAPP' }, { name: 'CELI — ETF' }]
    expect(matchEnvelope('Livret A — objectif atteint', known)?.name).toBe('Livret A / Matelas €')
    expect(matchEnvelope('CELI restant', known)?.name).toBe('CELI — ETF')
    expect(matchEnvelope('Valeur condo', known)).toBeUndefined()
  })
})

describe('parsePlanWorkbook', () => {
  it('lit périodes, postes, primes, enveloppes et objectifs du classeur', async () => {
    const plan = parsePlanWorkbook(await readXlsx(planFixture()))

    expect(plan.periods.map((p) => [p.label, p.start_month, p.end_month, p.currency])).toEqual([
      ['2026 (Nov-Déc)', '2026-11-01', '2026-12-01', 'EUR'],
      ['2027', '2027-01-01', '2027-12-01', 'EUR'],
      ['2028 Canada (Mai-Déc)', '2028-05-01', '2028-12-01', 'CAD'],
    ])
    const [p2026, p2027, p2028] = plan.periods
    expect(p2026).toMatchObject({ savings_target_cents: 50000, age_label: '30 ans' })
    expect(p2026!.notes).toContain('Nov 2026 — Début du suivi')

    // mois actifs lus dans le libellé, montants en centimes
    expect(p2027!.lines).toEqual([
      {
        kind: 'income',
        label: 'Salaire net',
        monthly_cents: 200000,
        first_month: '2027-01-01',
        last_month: '2027-06-01',
      },
      {
        kind: 'income',
        label: 'Salaire net cadre',
        monthly_cents: 240000,
        first_month: '2027-07-01',
        last_month: '2027-12-01',
      },
      {
        kind: 'expense',
        label: 'Loyer',
        monthly_cents: 70000,
        first_month: null,
        last_month: null,
      },
      {
        kind: 'expense',
        label: 'Formation',
        monthly_cents: 50000,
        first_month: '2027-01-01',
        last_month: '2027-07-01',
      },
      {
        kind: 'expense',
        label: 'Prêt',
        monthly_cents: 80000,
        first_month: '2027-08-01',
        last_month: '2027-12-01',
      },
    ])
    expect(p2027!.bonuses).toEqual([
      {
        label: 'Prime an 1',
        planned_cents: 120000,
        expected_month: '2027-05-01',
        expected_label: null,
        received_cents: 115000,
        received_on: '2027-05-01',
      },
      {
        label: 'Augmentation',
        planned_cents: 0,
        expected_month: null,
        expected_label: "Début d'année",
        received_cents: null,
        received_on: null,
      },
    ])
    expect(p2028!.bonuses[0]).toMatchObject({ planned_cents: -200000 })

    // enveloppes : noms du RECAP, et celles qui n'y sont pas, dans la devise de la période
    expect(plan.envelopes).toEqual([
      { name: 'Livret A / Matelas €', currency: 'EUR' },
      { name: 'Assurance-vie', currency: 'EUR' },
      { name: 'CELI — ETF', currency: 'CAD' },
      { name: 'CELIAPP', currency: 'CAD' },
      { name: 'Valeur condo', currency: 'CAD' },
    ])
    expect(p2026!.envelopes).toEqual([
      { name: 'Livret A / Matelas €', target_cents: 100000 },
      { name: 'Assurance-vie', target_cents: 5000 },
    ])
    expect(p2028!.envelopes.map((e) => e.name)).toEqual(['CELIAPP', 'CELI — ETF', 'Valeur condo'])

    expect(plan.goals).toEqual([
      expect.objectContaining({
        title: 'Ouvrir une assurance-vie',
        target_date: '2026-11-30',
        achieved: true,
      }),
      expect.objectContaining({
        title: 'Atteindre 10 000€ de base',
        target_date: '2028-05-31',
        achieved: false,
      }),
      expect.objectContaining({ title: 'Résidence permanente', target_date: '2030-12-31' }),
    ])
    expect(plan.goals[1]!.description).toContain('Avant le départ')
  })

  it('explique quand le classeur n’a pas la forme attendue', async () => {
    const sheets = await readXlsx(planFixture())
    expect(() => parsePlanWorkbook(sheets.slice(0, 1))).toThrow(PlanImportError)
  })
})
