import { fold } from '@/lib/naturalDate'
import type { Sheet } from '@/lib/xlsx'
import type { Currency, LineKind } from './types'

/**
 * Lecture du classeur « Suivi financier » : un onglet RECAP (périodes, enveloppes, objectifs)
 * et un onglet par période (« 2027 France », « 2028 Canada »…). Les sections sont repérées par
 * leurs titres, pas par leur numéro de ligne : ajouter des postes dans le classeur ne casse rien.
 */

export type ImportedLine = {
  kind: LineKind
  label: string
  monthly_cents: number
  first_month: string | null
  last_month: string | null
}

export type ImportedBonus = {
  label: string
  planned_cents: number
  expected_month: string | null
  expected_label: string | null
  received_cents: number | null
  received_on: string | null
}

export type ImportedPeriod = {
  sheet: string
  label: string
  start_month: string
  end_month: string
  currency: Currency
  savings_target_cents: number | null
  age_label: string | null
  notes: string | null
  /** Lignes du journal : date telle qu'écrite, mois si elle est précise */
  journal: { label: string; month: string | null; text: string }[]
  lines: ImportedLine[]
  bonuses: ImportedBonus[]
  /** Solde visé en fin de période, par nom d'enveloppe (celui de `PlanImport.envelopes`) */
  envelopes: { name: string; target_cents: number }[]
}

export type ImportedGoal = {
  /** Cible telle qu'écrite (« 15 000€ », « 40 000 CAD », « Jour J ») */
  target_label: string | null
  title: string
  target_date: string | null
  description: string | null
  achieved: boolean
}

export type PlanImport = {
  periods: ImportedPeriod[]
  envelopes: { name: string; currency: Currency }[]
  goals: ImportedGoal[]
}

export class PlanImportError extends Error {}

const MONTHS: [string, number][] = [
  ['jan', 1],
  ['fev', 2],
  ['mar', 3],
  ['avr', 4],
  ['mai', 5],
  ['juil', 7], // avant « jui » de juin
  ['jul', 7],
  ['juin', 6],
  ['jun', 6],
  ['aou', 8],
  ['sep', 9],
  ['oct', 10],
  ['nov', 11],
  ['dec', 12],
]

/** « Fév », « juillet », « Août » → 2, 7, 8 ; null si ce n'est pas un mois. */
export function monthNumber(word: string): number | null {
  const w = fold(word.trim()).replace(/\.$/, '')
  if (w.length < 3) return null
  return MONTHS.find(([prefix]) => w.startsWith(prefix))?.[1] ?? null
}

const pad = (n: number) => String(n).padStart(2, '0')
const monthIso = (year: number, month: number) => `${year}-${pad(month)}-01`
const lastDay = (year: number, month: number) =>
  `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`
const cents = (n: number) => Math.round(n * 100)

/** « Décembre 2026 » → 2026-12-01 ; null pour « Mi-année », « Fin 2031 »… */
export function parseMonthYear(text: string): string | null {
  const m = /^(\p{L}+)\.?\s+(\d{4})$/u.exec(text.trim())
  const month = m ? monthNumber(m[1]!) : null
  return m && month ? monthIso(Number(m[2]), month) : null
}

/** Échéance d'un objectif : « Nov 2026 » → 30 nov., « 2035 » → 31 déc., « 2029-2030 » → 31 déc. 2030. */
export function parseDeadline(text: string): string | null {
  const t = text.trim()
  const month = parseMonthYear(t)
  if (month) return lastDay(Number(month.slice(0, 4)), Number(month.slice(5, 7)))
  const years = t.match(/\b(\d{4})\b/g)
  return years ? `${years.at(-1)}-12-31` : null
}

/** Nom d'enveloppe sans la précision entre parenthèses : « CELIAPP (667 CAD/mois) » → « CELIAPP ». */
export const envelopeName = (label: string) => label.replace(/\s*\(.*\)\s*$/, '').trim()

const tokens = (name: string) =>
  fold(name)
    .split(/[^\p{L}\d]+/u)
    .filter(Boolean)

/** Même enveloppe ? « Livret A » et « Livret A / Matelas € » oui ; « CELI » et « CELIAPP » non. */
export function sameEnvelope(a: string, b: string): boolean {
  const ta = tokens(a)
  const tb = tokens(b)
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta]
  return short.length > 0 && short.every((t, i) => long[i] === t)
}

/**
 * Enveloppe connue correspondant à un libellé d'onglet : même début de nom, sinon la seule dont le
 * premier mot est le même (« Livret A — objectif atteint » → « Livret A / Matelas € »).
 */
export function matchEnvelope<T extends { name: string }>(name: string, known: T[]): T | undefined {
  const exact = known.find((k) => sameEnvelope(k.name, name))
  if (exact) return exact
  const first = tokens(name)[0]
  const same = known.filter((k) => tokens(k.name)[0] === first)
  return same.length === 1 ? same[0] : undefined
}

const isTitle = (s: Sheet, row: number, ...words: string[]) => {
  const a = fold(s.text(row, 1))
  return words.every((w) => a.includes(w))
}

/** Ligne d'en-tête dont les premières colonnes commencent par ces mots. */
function findHeader(s: Sheet, from: number, ...words: string[]): number | null {
  for (let r = from; r <= s.rowCount; r++) {
    if (words.every((w, i) => fold(s.text(r, i + 1)).startsWith(w))) return r
  }
  return null
}

/** Mois couverts par la période : années du nom de l'onglet, mois de l'en-tête « Poste | Prévu/mois | Jan… ». */
function periodMonths(s: Sheet, header: number): { start: string; end: string } {
  const year = Number(/\d{4}/.exec(s.name)?.[0] ?? NaN)
  const months: number[] = []
  for (let c = 3; ; c++) {
    const m = monthNumber(s.text(header, c))
    if (!m) break
    months.push(m)
  }
  if (!year || months.length === 0)
    throw new PlanImportError(`Onglet « ${s.name} » : année ou mois introuvables.`)
  return { start: monthIso(year, months[0]!), end: monthIso(year, months.at(-1)!) }
}

/** « Salaire cadre (juil→déc) » → libellé et mois actifs ; sans flèche, toute la période. */
function lineMonths(label: string, year: number) {
  const m = /\s*\(([^)]*?)(\p{L}+)\.?\s*→\s*(\p{L}+)([^)]*)\)/u.exec(label)
  const from = m ? monthNumber(m[2]!) : null
  const to = m ? monthNumber(m[3]!) : null
  if (!m || !from || !to) return { label, first_month: null, last_month: null }
  return {
    label: `${label.slice(0, m.index)}${label.slice(m.index + m[0].length)}`.trim(),
    first_month: monthIso(year, from),
    last_month: monthIso(year, to),
  }
}

function readPeriodSheet(s: Sheet): Omit<
  ImportedPeriod,
  'label' | 'savings_target_cents' | 'age_label'
> & {
  envelopeLabels: { name: string; target_cents: number }[]
} {
  const header = findHeader(s, 1, 'poste', 'prevu')
  if (!header)
    throw new PlanImportError(`Onglet « ${s.name} » : en-tête « Poste | Prévu/mois » introuvable.`)
  const { start, end } = periodMonths(s, header)
  const year = Number(start.slice(0, 4))
  const currency: Currency = /canada|cad/i.test(s.name) ? 'CAD' : 'EUR'

  const lines: ImportedLine[] = []
  let kind: LineKind | null = null
  let r = header + 1
  for (; r <= s.rowCount; r++) {
    const a = s.text(r, 1)
    const f = fold(a)
    if (f.includes('revenus') && !f.startsWith('total')) kind = 'income'
    else if (f.includes('depenses') && !f.startsWith('total')) kind = 'expense'
    else if (f.startsWith('total')) {
      if (kind === 'expense') break
      kind = null
    } else if (kind && a) {
      const amount = s.number(r, 2)
      if (amount !== null)
        lines.push({ kind, monthly_cents: cents(amount), ...lineMonths(a, year) })
    }
  }

  const bonuses: ImportedBonus[] = []
  const bonusHeader = findHeader(s, r, 'prime', 'montant')
  if (bonusHeader) {
    for (let b = bonusHeader + 1; b <= s.rowCount; b++) {
      const label = s.text(b, 1)
      if (!label || fold(label).startsWith('total')) break
      const expected = s.text(b, 3)
      const received = s.number(b, 4)
      bonuses.push({
        label,
        planned_cents: cents(s.number(b, 2) ?? 0),
        expected_month: parseMonthYear(expected),
        expected_label: parseMonthYear(expected) ? null : expected || null,
        received_cents: received === null ? null : cents(received),
        received_on: received === null ? null : parseMonthYear(s.text(b, 5)),
      })
    }
  }

  const envelopeLabels: { name: string; target_cents: number }[] = []
  const envHeader = findHeader(s, r, 'enveloppe', 'objectif')
  if (envHeader) {
    for (let e = envHeader + 1; e <= s.rowCount && s.text(e, 1); e++) {
      const target = s.number(e, 2)
      if (target !== null)
        envelopeLabels.push({ name: envelopeName(s.text(e, 1)), target_cents: cents(target) })
    }
  }

  const notes: string[] = []
  for (let n = 2; n < header; n++) if (s.text(n, 1)) notes.push(s.text(n, 1))
  const journal: ImportedPeriod['journal'] = []
  const journalHeader = findHeader(s, r, 'date', 'evenement')
  if (journalHeader) {
    if (notes.length) notes.push('')
    for (let j = journalHeader + 1; j <= s.rowCount && s.text(j, 1); j++) {
      notes.push(`${s.text(j, 1)} — ${s.text(j, 2)}`)
      journal.push({ label: s.text(j, 1), month: parseMonthYear(s.text(j, 1)), text: s.text(j, 2) })
    }
  }

  return {
    sheet: s.name,
    start_month: start,
    end_month: end,
    currency,
    notes: notes.length ? notes.join('\n') : null,
    journal,
    lines,
    bonuses,
    envelopes: [],
    envelopeLabels,
  }
}

/** Lit tout le classeur ; lève `PlanImportError` avec un message lisible s'il n'a pas la forme attendue. */
export function parsePlanWorkbook(sheets: Sheet[]): PlanImport {
  const recap = sheets.find((s) => fold(s.name).includes('recap'))
  const periodSheets = sheets.filter((s) => s !== recap && findHeader(s, 1, 'poste', 'prevu'))
  if (periodSheets.length === 0)
    throw new PlanImportError('Aucun onglet de période trouvé (en-tête « Poste | Prévu/mois »).')

  // RECAP : libellé, âge et épargne visée de chaque période, reliés à l'onglet par la formule
  const recapRows = new Map<string, { label: string; age: string | null; target: number | null }>()
  const envelopes: { name: string; currency: Currency }[] = []
  const goals: ImportedGoal[] = []
  if (recap) {
    const ph = findHeader(recap, 1, 'periode')
    if (ph) {
      for (let r = ph + 1; r <= recap.rowCount; r++) {
        const label = recap.text(r, 1)
        if (!label || fold(label).startsWith('total')) break
        let sheet: string | null = null
        for (let c = 2; c <= 8 && !sheet; c++) {
          const f = recap.cell(r, c)?.formula
          sheet = f ? (/^='?([^'!]+)'?!/.exec(f)?.[1] ?? null) : null
        }
        if (sheet) {
          const target = recap.number(r, 3)
          recapRows.set(sheet, { label, age: recap.text(r, 2) || null, target })
        }
      }
    }
    const eh = findHeader(recap, 1, 'enveloppe', 'devise')
    if (eh) {
      for (let r = eh + 1; r <= recap.rowCount && recap.text(r, 1); r++)
        envelopes.push({
          name: recap.text(r, 1),
          currency: /cad|\$/i.test(recap.text(r, 2)) ? 'CAD' : 'EUR',
        })
    }
    const gh = findHeader(recap, 1, 'objectif', 'deadline')
    if (gh) {
      for (let r = gh + 1; r <= recap.rowCount; r++) {
        const title = recap.text(r, 1)
        if (!title || isTitle(recap, r, 'legende')) break
        const details = [
          recap.text(r, 4) && `Cible : ${recap.text(r, 4)}`,
          recap.text(r, 3) && `Âge : ${recap.text(r, 3)}`,
          recap.text(r, 2) && `Échéance prévue : ${recap.text(r, 2)}`,
          recap.text(r, 6),
        ].filter(Boolean)
        goals.push({
          title,
          target_label: recap.text(r, 4) || null,
          target_date: parseDeadline(recap.text(r, 2)),
          description: details.length ? details.join('\n') : null,
          achieved: /✅|fait|atteint/i.test(recap.text(r, 5)),
        })
      }
    }
  }

  const periods: ImportedPeriod[] = periodSheets.map((s) => {
    const { envelopeLabels, ...p } = readPeriodSheet(s)
    const recapRow = recapRows.get(s.name)
    for (const e of envelopeLabels) {
      let known = matchEnvelope(e.name, envelopes)
      if (!known) {
        known = { name: e.name, currency: p.currency }
        envelopes.push(known)
      }
      p.envelopes.push({ name: known.name, target_cents: e.target_cents })
    }
    return {
      ...p,
      label: recapRow?.label ?? s.name,
      age_label: recapRow?.age ?? null,
      savings_target_cents: recapRow?.target != null ? cents(recapRow.target) : null,
    }
  })
  periods.sort((a, b) => a.start_month.localeCompare(b.start_month))
  return { periods, envelopes, goals }
}
