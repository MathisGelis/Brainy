import { parseEventInput } from './parseEventInput'

// Mardi 20 octobre 2026
const today = '2026-10-20'
const parse = (text: string, day = today) => parseEventInput(text, day, today)

describe('parseEventInput', () => {
  it('sans date : le jour ouvert, toute la journée', () => {
    expect(parse('Télétravail', '2026-10-23')).toMatchObject({
      title: 'Télétravail',
      start_on: '2026-10-23',
      end_on: '2026-10-23',
      start_time: null,
      repeat: null,
    })
  })

  it('plusieurs jours dans le même mois', () => {
    expect(parse('En déplacement à Lyon du 12 au 14 novembre')).toMatchObject({
      title: 'En déplacement à Lyon',
      start_on: '2026-11-12',
      end_on: '2026-11-14',
    })
  })

  it('plusieurs jours à cheval sur deux mois, et avec des jours de la semaine', () => {
    expect(parse('Ski du 28 au 2 mars')).toMatchObject({
      start_on: '2027-02-28',
      end_on: '2027-03-02',
    })
    expect(parse('Vacances du 30 novembre au 4 décembre')).toMatchObject({
      title: 'Vacances',
      start_on: '2026-11-30',
      end_on: '2026-12-04',
    })
    expect(parse('Séminaire du lundi au mercredi')).toMatchObject({
      title: 'Séminaire',
      start_on: '2026-10-26',
      end_on: '2026-10-28',
      repeat: null,
    })
  })

  it('une date et une heure, ou une plage horaire', () => {
    expect(parse('Dentiste jeudi 14h30')).toMatchObject({
      title: 'Dentiste',
      start_on: '2026-10-22',
      start_time: '14:30',
      end_time: null,
    })
    expect(parse('Réunion demain de 9h à 10h30')).toMatchObject({
      title: 'Réunion',
      start_on: '2026-10-21',
      start_time: '09:00',
      end_time: '10:30',
    })
    expect(parse('Match 20:45')).toMatchObject({ title: 'Match', start_time: '20:45' })
  })

  it('une durée ou un week-end', () => {
    expect(parse('Formation le 3 novembre pendant 3 jours')).toMatchObject({
      start_on: '2026-11-03',
      end_on: '2026-11-05',
    })
    expect(parse('Chez mes parents ce week-end')).toMatchObject({
      title: 'Chez mes parents',
      start_on: '2026-10-24',
      end_on: '2026-10-25',
    })
  })

  it('« jusqu’au » sans récurrence : dernier jour de l’événement', () => {
    expect(parse('En congé jusqu’au 2 novembre')).toMatchObject({
      title: 'En congé',
      start_on: today,
      end_on: '2026-11-02',
      repeat: null,
    })
  })

  it('récurrences annuelles, mensuelles et quotidiennes', () => {
    expect(parse('Anniversaire de Léa le 3 mars tous les ans')).toMatchObject({
      title: 'Anniversaire de Léa',
      start_on: '2027-03-03',
      repeat: 'yearly',
      repeat_every: 1,
    })
    expect(parse('Loyer le 5 chaque mois')).toMatchObject({
      start_on: '2026-11-05',
      repeat: 'monthly',
    })
    expect(parse('Révisions tous les 2 jours')).toMatchObject({
      repeat: 'daily',
      repeat_every: 2,
    })
  })

  it('récurrence hebdomadaire sur des jours précis, avec fin', () => {
    expect(parse('Yoga tous les lundis et jeudis de 19h à 20h jusqu’au 20 décembre')).toMatchObject(
      {
        title: 'Yoga',
        start_on: '2026-10-22', // le prochain jour prévu : jeudi
        start_time: '19:00',
        end_time: '20:00',
        repeat: 'weekly',
        repeat_days: [1, 4],
        repeat_until: '2026-12-20',
      },
    )
    expect(parse('Garde alternée toutes les 2 semaines le vendredi')).toMatchObject({
      title: 'Garde alternée',
      start_on: '2026-10-23',
      repeat: 'weekly',
      repeat_every: 2,
      repeat_days: [5],
    })
  })
})
