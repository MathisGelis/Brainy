import { addMonthsClamped, extractDate, fold, isoWeekday } from './naturalDate'

const TODAY = '2026-10-14' // mercredi

const date = (text: string, dir: 'future' | 'past' = 'future') =>
  extractDate(text, TODAY, dir)?.value

describe('extractDate', () => {
  it.each([
    ["aujourd'hui", '2026-10-14'],
    ['demain', '2026-10-15'],
    ['après-demain', '2026-10-16'],
    ['dans 3 jours', '2026-10-17'],
    ['dans 2 semaines', '2026-10-28'],
    ['dans 1 mois', '2026-11-14'],
    ['semaine prochaine', '2026-10-19'],
    ['lundi', '2026-10-19'],
    ['mercredi', '2026-10-21'], // même jour : la semaine suivante
    ['vendredi prochain', '2026-10-16'],
    ['le 20', '2026-10-20'],
    ['le 3', '2026-11-03'], // déjà passé ce mois-ci
    ['15/11', '2026-11-15'],
    ['01/02', '2027-02-01'], // déjà passé cette année
    ['15/11/2027', '2027-11-15'],
    ['15/11/27', '2027-11-15'],
    ['3 novembre', '2026-11-03'],
    ['1er janvier', '2027-01-01'],
    ['12 déc.', '2026-12-12'],
  ])('futur : « %s » → %s', (text, expected) => {
    expect(date(text)).toBe(expected)
  })

  it.each([
    ['hier', '2026-10-13'],
    ['avant-hier', '2026-10-12'],
    ['samedi', '2026-10-10'],
    ['mercredi', '2026-10-14'], // aujourd'hui
    ['le 20', '2026-09-20'],
    ['15/11', '2025-11-15'],
  ])('passé : « %s » → %s', (text, expected) => {
    expect(date(text, 'past')).toBe(expected)
  })

  it('retire la date (et sa préposition) du texte', () => {
    expect(extractDate('Payer le loyer pour demain', TODAY)?.rest).toBe('Payer le loyer')
    expect(extractDate('Payer le loyer le 20', TODAY)?.rest).toBe('Payer le loyer')
    expect(extractDate('Appeler Léa lundi prochain', TODAY)?.rest).toBe('Appeler Léa')
  })

  it('ne confond pas les mots ordinaires avec des dates', () => {
    expect(extractDate('Payer le loyer', TODAY)).toBeNull()
    expect(extractDate('Lire Demainville', TODAY)).toBeNull()
    expect(extractDate('Acheter des pommes', TODAY)).toBeNull()
  })

  it('ignore les dates impossibles', () => {
    expect(extractDate('12.50', TODAY)).toBeNull()
    expect(extractDate('31/02', TODAY)).toBeNull()
    expect(extractDate('le 31 et rien', '2026-11-05')?.value).toBe('2026-12-31')
  })
})

describe('utilitaires', () => {
  it('fold garde la longueur', () => {
    const text = 'Été Août Œuf'
    expect(fold(text)).toHaveLength(text.length)
    expect(fold(text)).toBe('ete aout œuf')
  })

  it('jour ISO de la semaine', () => {
    expect(isoWeekday('2026-10-12')).toBe(1)
    expect(isoWeekday('2026-10-18')).toBe(7)
  })

  it('ajoute des mois en bornant à la fin du mois', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonthsClamped('2026-02-28', 1, 31)).toBe('2026-03-31')
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15')
    expect(addMonthsClamped('2026-01-15', -1)).toBe('2025-12-15')
  })
})
