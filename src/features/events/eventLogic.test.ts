import {
  describeRepeat,
  formatTime,
  occurrenceStarts,
  occurrencesByDay,
  occurrencesOn,
  occurrenceWhen,
} from './eventLogic'
import type { CalendarEvent } from './types'

const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e1',
  title: 'Événement',
  start_on: '2026-10-20',
  end_on: '2026-10-20',
  start_time: null,
  end_time: null,
  note: null,
  repeat: null,
  repeat_every: 1,
  repeat_days: null,
  repeat_until: null,
  skipped: [],
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

describe('occurrenceStarts', () => {
  it('sans récurrence : une seule occurrence, si elle recouvre la période', () => {
    const e = ev({ start_on: '2026-11-12', end_on: '2026-11-14' })
    expect(occurrenceStarts(e, '2026-11-01', '2026-11-30')).toEqual(['2026-11-12'])
    // commencé avant la période mais encore en cours
    expect(occurrenceStarts(e, '2026-11-13', '2026-11-13')).toEqual(['2026-11-12'])
    expect(occurrenceStarts(e, '2026-11-15', '2026-11-30')).toEqual([])
  })

  it('tous les N jours, à partir du premier jour seulement', () => {
    const e = ev({ start_on: '2026-10-20', repeat: 'daily', repeat_every: 3 })
    expect(occurrenceStarts(e, '2026-10-01', '2026-10-31')).toEqual([
      '2026-10-20',
      '2026-10-23',
      '2026-10-26',
      '2026-10-29',
    ])
  })

  it('chaque semaine sur des jours choisis, une semaine sur deux', () => {
    const e = ev({
      start_on: '2026-10-20', // mardi
      repeat: 'weekly',
      repeat_every: 2,
      repeat_days: [2, 5],
    })
    expect(occurrenceStarts(e, '2026-10-19', '2026-11-15')).toEqual([
      '2026-10-20',
      '2026-10-23',
      '2026-11-03',
      '2026-11-06',
    ])
  })

  it('chaque mois et chaque année : même quantième, borné à la fin du mois', () => {
    const monthly = ev({ start_on: '2026-01-31', end_on: '2026-01-31', repeat: 'monthly' })
    expect(occurrenceStarts(monthly, '2026-02-01', '2026-04-30')).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
    const birthday = ev({ start_on: '2024-02-29', end_on: '2024-02-29', repeat: 'yearly' })
    expect(occurrenceStarts(birthday, '2027-01-01', '2028-12-31')).toEqual([
      '2027-02-28',
      '2028-02-29',
    ])
  })

  it('respecte la date de fin et les occurrences supprimées', () => {
    const e = ev({
      repeat: 'weekly',
      repeat_until: '2026-11-10',
      skipped: ['2026-10-27'],
    })
    expect(occurrenceStarts(e, '2026-10-01', '2026-12-31')).toEqual([
      '2026-10-20',
      '2026-11-03',
      '2026-11-10',
    ])
  })

  it('reste rapide sur une série ancienne', () => {
    const e = ev({ start_on: '2000-01-01', end_on: '2000-01-01', repeat: 'daily' })
    expect(occurrenceStarts(e, '2026-10-20', '2026-10-21')).toEqual(['2026-10-20', '2026-10-21'])
  })
})

describe('occurrencesByDay', () => {
  it('range chaque jour couvert, les événements de plusieurs jours en premier', () => {
    const trip = ev({ id: 'trip', title: 'Lyon', start_on: '2026-10-21', end_on: '2026-10-23' })
    const dentist = ev({
      id: 'd',
      title: 'Dentiste',
      start_on: '2026-10-22',
      start_time: '14:30:00',
      end_on: '2026-10-22',
    })
    const allDay = ev({
      id: 'a',
      title: 'Anniversaire',
      start_on: '2026-10-22',
      end_on: '2026-10-22',
    })
    const map = occurrencesByDay([dentist, trip, allDay], '2026-10-19', '2026-10-25')
    expect([...map.keys()].sort()).toEqual(['2026-10-21', '2026-10-22', '2026-10-23'])
    expect(map.get('2026-10-22')!.map((o) => o.event.title)).toEqual([
      'Lyon',
      'Anniversaire',
      'Dentiste',
    ])
    expect(occurrencesOn([trip], '2026-10-24')).toEqual([])
  })
})

describe('affichage', () => {
  it('heures et position dans un séjour', () => {
    expect(formatTime('09:00:00')).toBe('9h')
    expect(formatTime('14:30')).toBe('14h30')
    const trip = ev({ start_on: '2026-10-21', end_on: '2026-10-23' })
    expect(
      occurrenceWhen({ event: trip, start: '2026-10-21', end: '2026-10-23' }, '2026-10-22'),
    ).toBe('jour 2/3 · du 21 oct. au 23 oct.')
    const meeting = ev({ start_time: '09:00:00', end_time: '10:30:00' })
    expect(
      occurrenceWhen(
        { event: meeting, start: meeting.start_on, end: meeting.end_on },
        meeting.start_on,
      ),
    ).toBe('9h–10h30')
    expect(
      occurrenceWhen({ event: ev({}), start: '2026-10-20', end: '2026-10-20' }, '2026-10-20'),
    ).toBe('Toute la journée')
  })

  it('décrit la récurrence', () => {
    expect(describeRepeat(ev({}))).toBeNull()
    expect(describeRepeat(ev({ repeat: 'yearly' }))).toBe('Tous les ans')
    expect(describeRepeat(ev({ repeat: 'weekly', repeat_every: 2, repeat_days: [1, 4] }))).toBe(
      'Toutes les 2 semaines le lundi et le jeudi',
    )
    expect(describeRepeat(ev({ repeat: 'weekly', repeat_days: [1, 2, 3, 4, 5] }))).toBe(
      'En semaine',
    )
    expect(describeRepeat(ev({ repeat: 'monthly', repeat_until: '2026-12-20' }))).toBe(
      'Tous les mois, jusqu’au 20 déc.',
    )
  })
})
