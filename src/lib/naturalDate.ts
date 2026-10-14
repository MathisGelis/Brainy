import { addDays } from './dates'

/**
 * Analyse de dates en français dans une saisie libre (« demain », « lundi », « dans 3 jours »,
 * « le 15 », « 15/11 », « 15 novembre », « hier »…). Calculs sur des jours ISO `YYYY-MM-DD`.
 */

export const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const MONTHS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
]

export type Direction = 'future' | 'past'

/** Jour ISO de la semaine : 1 = lundi … 7 = dimanche. */
export function isoWeekday(iso: string): number {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/** Date valide ? (rejette 31/02, 12/50…) */
function validDate(y: number, m: number, d: number): boolean {
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)
}

/** Ajoute des mois en gardant le jour d'ancrage (borné à la fin du mois : 31 → 30 → 28…). */
export function addMonthsClamped(iso: string, months: number, anchorDay?: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const total = y * 12 + (m - 1) + months
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return toISO(year, month, Math.min(anchorDay ?? d, daysInMonth(year, month)))
}

/** Remplace chaque caractère par sa version minuscule sans accent, en gardant la même longueur. */
export function fold(text: string): string {
  return Array.from(text, (c) => {
    const f = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    return f.length === 1 ? f : c.toLowerCase().slice(0, 1) || c
  }).join('')
}

const B = '(?<![\\p{L}\\d])'
const E = '(?![\\p{L}\\d])'
const PREFIX = `(?:(?:pour|le|ce|avant|d'ici|des)\\s+)?`
const WEEKDAY_RE = WEEKDAYS.join('|')
const MONTH_RE =
  '(janv(?:ier)?|fevr?(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|aout|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|dec(?:embre)?)'

type Rule = {
  re: RegExp
  resolve: (m: RegExpExecArray, today: string, dir: Direction) => string | null
}

const re = (body: string) => new RegExp(`${B}${PREFIX}${body}${E}`, 'u')

function monthIndex(word: string): number {
  return MONTHS.findIndex((name) => name.startsWith(word.slice(0, 3))) + 1
}

/** Jour + mois sans année : année déduite selon la direction (futur ou passé). */
function inferYear(day: number, month: number, today: string, dir: Direction): string | null {
  const year = Number(today.slice(0, 4))
  for (const y of dir === 'future' ? [year, year + 1] : [year, year - 1]) {
    if (!validDate(y, month, day)) continue
    const iso = toISO(y, month, day)
    if (dir === 'future' ? iso >= today : iso <= today) return iso
  }
  return null
}

const RULES: Rule[] = [
  {
    re: re('dans\\s+(\\d{1,3})\\s+(jours?|semaines?|mois)'),
    resolve: (m, today) => {
      const n = Number(m[1])
      if (m[2]!.startsWith('mois')) return addMonthsClamped(today, n)
      return addDays(today, m[2]!.startsWith('semaine') ? n * 7 : n)
    },
  },
  { re: re('apres[- ]demain'), resolve: (_m, t) => addDays(t, 2) },
  { re: re('avant[- ]hier'), resolve: (_m, t) => addDays(t, -2) },
  { re: re("(?:aujourd'?hui|auj|ce soir|ce matin|ce midi)"), resolve: (_m, t) => t },
  { re: re('demain'), resolve: (_m, t) => addDays(t, 1) },
  { re: re('hier'), resolve: (_m, t) => addDays(t, -1) },
  {
    re: re('(?:la\\s+)?semaine\\s+prochaine'),
    resolve: (_m, t) => addDays(t, 8 - isoWeekday(t)),
  },
  {
    re: re('(\\d{1,2})[/.-](\\d{1,2})(?:[/.-](\\d{2}|\\d{4}))?'),
    resolve: (m, today, dir) => {
      const day = Number(m[1])
      const month = Number(m[2])
      if (!m[3]) return inferYear(day, month, today, dir)
      const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
      return validDate(year, month, day) ? toISO(year, month, day) : null
    },
  },
  {
    re: re(`(\\d{1,2})(?:er)?\\s+${MONTH_RE}\\.?(?:\\s+(\\d{4}))?`),
    resolve: (m, today, dir) => {
      const day = Number(m[1])
      const month = monthIndex(m[2]!)
      if (!m[3]) return inferYear(day, month, today, dir)
      const year = Number(m[3])
      return validDate(year, month, day) ? toISO(year, month, day) : null
    },
  },
  {
    re: new RegExp(`${B}le\\s+(\\d{1,2})(?:er)?${E}`, 'u'),
    resolve: (m, today, dir) => {
      const day = Number(m[1])
      for (const offset of dir === 'future' ? [0, 1] : [0, -1]) {
        const candidate = addMonthsClamped(today, offset, 1)
        const [y, mo] = candidate.split('-').map(Number) as [number, number]
        if (!validDate(y, mo, day)) continue
        const iso = toISO(y, mo, day)
        if (dir === 'future' ? iso >= today : iso <= today) return iso
      }
      return null
    },
  },
  {
    re: re(`(${WEEKDAY_RE})(?:\\s+(?:prochain|dernier))?`),
    resolve: (m, today, dir) => {
      const target = WEEKDAYS.indexOf(m[1]!) + 1
      const current = isoWeekday(today)
      if (dir === 'future') return addDays(today, ((target - current + 6) % 7) + 1) // 1 à 7 jours
      return addDays(today, -((current - target + 7) % 7)) // 0 à 6 jours en arrière
    },
  },
]

export type Extraction = { value: string; rest: string; matched: string }

/** Retire `[start, end[` du texte et normalise les espaces. */
export function cut(text: string, start: number, end: number): string {
  return `${text.slice(0, start)} ${text.slice(end)}`.replace(/\s+/g, ' ').trim()
}

/** Cherche la première date reconnue ; renvoie la date et le texte sans elle. */
export function extractDate(
  text: string,
  today: string,
  dir: Direction = 'future',
): Extraction | null {
  const folded = fold(text)
  for (const rule of RULES) {
    const pattern = new RegExp(rule.re.source, 'gu')
    let m: RegExpExecArray | null
    while ((m = pattern.exec(folded))) {
      const value = rule.resolve(m, today, dir)
      if (value) {
        return {
          value,
          rest: cut(text, m.index, m.index + m[0].length),
          matched: text.slice(m.index, m.index + m[0].length),
        }
      }
    }
  }
  return null
}
