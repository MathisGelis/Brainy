import { addDays } from '@/lib/dates'
import { addMonthsClamped, cut, extractDate, fold, isoWeekday, WEEKDAYS } from '@/lib/naturalDate'
import type { Repeat } from './types'

export type ParsedEvent = {
  title: string
  start_on: string
  end_on: string
  start_time: string | null
  end_time: string | null
  repeat: Repeat | null
  repeat_every: number
  repeat_days: number[] | null
  repeat_until: string | null
}

const B = '(?<![\\p{L}\\d])'
const E = '(?![\\p{L}\\d])'
const DAY = `(?:${WEEKDAYS.join('|')})s?`
const MONTH =
  '(?:janv(?:ier)?|fevr?(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|aout|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|dec(?:embre)?)\\.?'
const rx = (body: string) => new RegExp(`${B}${body}${E}`, 'u')

const UNITS: Record<string, Repeat> = {
  jour: 'daily',
  semaine: 'weekly',
  moi: 'monthly',
  an: 'yearly',
  annee: 'yearly',
}

const weekdaysIn = (text: string) =>
  [
    ...new Set(
      Array.from(
        text.matchAll(new RegExp(WEEKDAYS.join('|'), 'g')),
        (m) => WEEKDAYS.indexOf(m[0]) + 1,
      ),
    ),
  ].sort()

type Recurrence = { repeat: Repeat; every: number; days: number[] | null }

/** Récurrences reconnues, de la plus précise à la plus générale. */
const RECURRENCES: { re: RegExp; build: (m: RegExpExecArray) => Recurrence }[] = [
  {
    // « toutes les 2 semaines le lundi et le jeudi », « toutes les semaines le mardi »
    re: rx(
      `(?:toutes les|chaque)\\s+(?:(\\d{1,2})\\s+)?semaines?\\s+(?:le|les)\\s+${DAY}(?:(?:\\s*,\\s*|\\s+et\\s+)(?:le\\s+)?${DAY})*`,
    ),
    build: (m) => ({ repeat: 'weekly', every: Number(m[1] ?? 1), days: weekdaysIn(m[0]) }),
  },
  {
    // « tous les lundis », « chaque mardi et jeudi »
    re: rx(`(?:tous les|chaque)\\s+${DAY}(?:(?:\\s*,\\s*|\\s+et\\s+)${DAY})*`),
    build: (m) => ({ repeat: 'weekly', every: 1, days: weekdaysIn(m[0]) }),
  },
  {
    re: rx('en semaine'),
    build: () => ({ repeat: 'weekly', every: 1, days: [1, 2, 3, 4, 5] }),
  },
  {
    re: rx('(?:tous les|chaque)\\s+week-?ends?'),
    build: () => ({ repeat: 'weekly', every: 1, days: [6, 7] }),
  },
  {
    // « tous les jours », « toutes les 2 semaines », « tous les 3 mois », « chaque année »
    re: rx('(?:tou(?:s|tes) les|chaque)\\s+(?:(\\d{1,2})\\s+)?(jours?|semaines?|mois|ans|annees?)'),
    build: (m) => ({
      repeat: UNITS[m[2]!.replace(/s$/, '')]!,
      every: Number(m[1] ?? 1),
      days: null,
    }),
  },
  { re: rx('quotidien(?:ne(?:ment)?)?'), build: () => ({ repeat: 'daily', every: 1, days: null }) },
  { re: rx('hebdo(?:madaire)?'), build: () => ({ repeat: 'weekly', every: 1, days: null }) },
  { re: rx('mensuel(?:le)?'), build: () => ({ repeat: 'monthly', every: 1, days: null }) },
  { re: rx('annuel(?:le)?'), build: () => ({ repeat: 'yearly', every: 1, days: null }) },
]

/** Une date reconnue tout au début de `text` (à quelques mots de liaison près). */
function dateAtStart(text: string, ref: string): { value: string; rest: string } | null {
  const found = extractDate(text, ref, 'future')
  if (!found) return null
  return fold(text).indexOf(fold(found.matched)) <= 3
    ? { value: found.value, rest: found.rest }
    : null
}

const pad = (n: number) => String(n).padStart(2, '0')
const TIME = '(\\d{1,2})\\s*(?:h|:)\\s*(\\d{2})?'
const toTime = (h: string, m: string | undefined) =>
  Number(h) <= 23 && Number(m ?? 0) <= 59 ? `${pad(Number(h))}:${pad(Number(m ?? 0))}` : null

/**
 * « Déplacement à Lyon du 12 au 14 nov », « Dentiste mardi 14h30 », « Anniversaire de Léa
 * le 3 mars tous les ans », « Yoga tous les lundis de 19h à 20h jusqu'au 20 décembre ».
 * Sans date, l'événement est pour `day` (le jour ouvert dans le calendrier).
 */
export function parseEventInput(input: string, day: string, today: string): ParsedEvent {
  let text = input.trim()
  const take = (m: RegExpExecArray) => {
    text = cut(text, m.index, m.index + m[0].length)
  }

  // 1. Récurrence (avant les dates : « tous les lundis » n'est pas « lundi prochain »)
  let rec: Recurrence | null = null
  for (const { re, build } of RECURRENCES) {
    const m = re.exec(fold(text))
    if (m) {
      rec = build(m)
      take(m)
      break
    }
  }

  // 2. « jusqu'au 20 décembre » : fin de la récurrence, ou dernier jour de l'événement
  let until: string | null = null
  const untilMatch = rx("jusqu'?(?:au|a|’au)").exec(fold(text).replace(/’/g, "'"))
  if (untilMatch) {
    const after = text.slice(untilMatch.index + untilMatch[0].length)
    const date = dateAtStart(after, today)
    if (date) {
      until = date.value
      text = `${text.slice(0, untilMatch.index)} ${date.rest}`.replace(/\s+/g, ' ').trim()
    }
  }

  // 3. Plusieurs jours : « du 12 au 14 novembre », « du lundi au mercredi », « du 30/11 au 2/12 »
  let start: string | null = null
  let end: string | null = null
  const sameMonth = rx(
    `du\\s+(\\d{1,2})(?:er)?\\s+au\\s+(\\d{1,2})(?:er)?\\s+(${MONTH}(?:\\s+\\d{4})?)`,
  ).exec(fold(text))
  if (sameMonth) {
    const last = extractDate(`${sameMonth[2]} ${sameMonth[3]}`, today, 'future')
    if (last) {
      const d1 = Number(sameMonth[1])
      const first = `${last.value.slice(0, 8)}${pad(d1)}`
      // « du 28 au 2 mars » : le premier jour est dans le mois d'avant
      start = first <= last.value ? first : addMonthsClamped(last.value, -1, d1)
      end = last.value
      take(sameMonth)
    }
  }
  if (!start) {
    const du = rx('du').exec(fold(text))
    const first = du && dateAtStart(text.slice(du.index + du[0].length), today)
    const au = first && /^\s*au\s+/u.exec(fold(first.rest))
    const second = first && au && dateAtStart(first.rest.slice(au[0].length), first.value)
    if (du && first && second && second.value >= first.value) {
      start = first.value
      end = second.value
      text = `${text.slice(0, du.index)} ${second.rest}`.replace(/\s+/g, ' ').trim()
    }
  }

  // 4. Heures : « de 14h à 16h », « 14h-15h30 », « à 9h », « 14:30 »
  let startTime: string | null = null
  let endTime: string | null = null
  const range = rx(`(?:de\\s+)?${TIME}\\s*(?:a|-|–)\\s*${TIME}`).exec(fold(text))
  if (range) {
    startTime = toTime(range[1]!, range[2])
    endTime = toTime(range[3]!, range[4])
    if (startTime) take(range)
  }
  if (!startTime) {
    const single = rx(`(?:a\\s+)?${TIME}`).exec(fold(text))
    if (single) {
      startTime = toTime(single[1]!, single[2])
      if (startTime) take(single)
    }
  }

  // 5. Durée : « pendant 3 jours », « 2 jours »
  let duration: number | null = null
  const dur = rx('(?:pendant\\s+)?(\\d{1,2})\\s+jours').exec(fold(text))
  if (dur && !start) {
    duration = Number(dur[1])
    take(dur)
  }

  // 6. Week-end : « ce week-end » = samedi et dimanche qui viennent
  if (!start) {
    const we = rx('(?:ce\\s+|le\\s+)?week-?end(?:\\s+prochain)?').exec(fold(text))
    if (we) {
      const wd = isoWeekday(today)
      start = wd === 7 ? today : addDays(today, wd === 6 ? 0 : 6 - wd)
      end = addDays(start, wd === 7 ? 0 : 1)
      take(we)
    }
  }

  // 7. Date simple
  if (!start) {
    const date = extractDate(text, today, 'future')
    if (date) {
      start = date.value
      text = date.rest
    }
  }
  if (!start) {
    start = day
    // « tous les mardis » sans date : la première occurrence à partir du jour ouvert
    if (rec?.repeat === 'weekly' && rec.days && !rec.days.includes(isoWeekday(day))) {
      for (let i = 1; i <= 7; i++) {
        if (rec.days.includes(isoWeekday(addDays(day, i)))) {
          start = addDays(day, i)
          break
        }
      }
    }
  }
  if (!end) end = duration ? addDays(start, duration - 1) : start
  if (until && !rec && until > start) {
    end = until
    until = null
  }
  if (endTime && end === start && startTime && endTime < startTime) endTime = null

  const title = text
    .replace(/\s+/g, ' ')
    .replace(/^(?:le|la|les|du|de|d’|d'|au|à|a|,|-|–)\s+/iu, '')
    .replace(/\s+(?:le|la|les|du|de|au|à|a|,|-|–)$/iu, '')
    .trim()

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    start_on: start,
    end_on: end,
    start_time: startTime,
    end_time: startTime ? endTime : null,
    repeat: rec?.repeat ?? null,
    repeat_every: rec?.every ?? 1,
    repeat_days: rec?.repeat === 'weekly' ? rec.days : null,
    repeat_until: rec && until && until >= start ? until : null,
  }
}
