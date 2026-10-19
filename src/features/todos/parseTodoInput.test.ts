import { parseTodoInput } from './parseTodoInput'

const TODAY = '2026-10-14' // mercredi
const parse = (text: string) => parseTodoInput(text, TODAY)

describe('parseTodoInput', () => {
  it('garde un titre simple tel quel', () => {
    expect(parse('Acheter du pain')).toEqual({
      title: 'Acheter du pain',
      due_date: null,
      priority: 'normal',
      recurrence: null,
      listName: null,
    })
  })

  it('reconnaît échéance, priorité et liste', () => {
    expect(parse('Payer le loyer demain ! #maison')).toMatchObject({
      title: 'Payer le loyer',
      due_date: '2026-10-15',
      priority: 'high',
      listName: 'maison',
    })
  })

  it('« ! » collé au mot compte aussi', () => {
    expect(parse('Rappeler la banque!')).toMatchObject({
      title: 'Rappeler la banque',
      priority: 'high',
    })
  })

  it('récurrence hebdomadaire sur jours nommés, première échéance déduite', () => {
    expect(parse('Sortir les poubelles tous les lundis et jeudis')).toMatchObject({
      title: 'Sortir les poubelles',
      recurrence: { kind: 'weekly', days: [1, 4] },
      due_date: '2026-10-15',
    })
  })

  it('récurrence mensuelle avec une date explicite', () => {
    expect(parse('Payer le loyer le 5 tous les mois')).toMatchObject({
      title: 'Payer le loyer',
      recurrence: { kind: 'monthly' },
      due_date: '2026-11-05',
    })
  })

  it('« chaque semaine » reprend le jour de l’échéance', () => {
    expect(parse('Courses vendredi chaque semaine')).toMatchObject({
      recurrence: { kind: 'weekly', days: [5] },
      due_date: '2026-10-16',
    })
  })

  it('« en semaine » et « tous les jours »', () => {
    expect(parse('Méditer tous les jours').recurrence).toEqual({ kind: 'daily' })
    expect(parse('Méditer tous les jours').due_date).toBe(TODAY)
    expect(parse('Stand-up en semaine').recurrence).toEqual({
      kind: 'weekly',
      days: [1, 2, 3, 4, 5],
    })
  })

  it('ne vide jamais le titre', () => {
    expect(parse('demain').title).toBe('demain')
  })
})
