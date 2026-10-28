import { formatMonthLabel } from '@/lib/dates'
import { fold } from '@/lib/naturalDate'
import { parseDeadline, type ImportedGoal, type PlanImport } from './importPlan'
import { formatMoney } from './planLogic'

/** Mots trop courants (ou lieux, présents partout) pour relier un objectif à une ligne du classeur. */
const STOP = new Set(
  'les des une pour avec dans sur par aux avant apres atteindre obtenir ouvrir construire faire demander base net ans possible verifier eligibilite objectif mois cad eur jour fin debut annee via canada montreal quebec france'.split(
    ' ',
  ),
)

const words = (text: string) =>
  new Set(
    fold(text)
      .split(/[^\p{L}\d]+/u)
      .map((w) => (w.length > 4 && /[sx]$/.test(w) ? w.slice(0, -1) : w)) // « condos » = « condo »
      .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)),
  )

/** « 15 000€ » → 1 500 000 ; « 60k CAD apport » → 6 000 000 ; « 700 pts » → null. */
export function targetCents(label: string | null): number | null {
  const m = /(\d[\d\s]*(?:[.,]\d+)?)\s*(k)?\s*(€|eur|cad|\$)/i.exec(label ?? '')
  if (!m) return null
  const n = Number(m[1]!.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * (m[2] ? 1000 : 1) * 100) : null
}

/** Mois (YYYY-MM-01) d'une date écrite : « Mai 2028 », « 2035 » (décembre), sinon null. */
function monthOfLabel(label: string): string | null {
  const day = parseDeadline(label)
  return day ? `${day.slice(0, 7)}-01` : null
}

type Step = { month: string; title: string }

/**
 * Jalons d'un objectif clé, tirés du reste du classeur, jusqu'à son échéance et dans l'ordre :
 * - la trajectoire de l'enveloppe qu'il vise (par son nom, ou par le montant de sa cible) ;
 * - les lignes du journal et les primes qui en parlent (un mot rare en commun, ou deux mots).
 * Au plus 8 ; aucun plutôt que des jalons hors sujet.
 */
export function goalMilestones(goal: ImportedGoal, plan: PlanImport): string[] {
  const deadline = goal.target_date ? `${goal.target_date.slice(0, 7)}-01` : '9999-12-01'
  const goalWords = words(goal.title)
  const steps: Step[] = []

  // 1. Trajectoire d'enveloppe
  const amount = targetCents(goal.target_label)
  const named = plan.envelopes.filter((e) => {
    const first = words(e.name).values().next().value
    return first !== undefined && goalWords.has(first)
  })
  const byAmount =
    amount === null
      ? undefined
      : plan.envelopes.find((e) =>
          plan.periods.some((p) =>
            p.envelopes.some((x) => x.name === e.name && x.target_cents === amount),
          ),
        )
  const envelopes = named.length > 0 ? named.slice(0, 2) : byAmount ? [byAmount] : []
  for (const envelope of envelopes) {
    let last: number | null = null
    for (const p of plan.periods) {
      if (p.start_month > deadline) break
      const target = p.envelopes.find((x) => x.name === envelope.name)?.target_cents
      if (!target || target === last) continue
      last = target
      steps.push({
        month: p.end_month,
        title: `${envelope.name} : ${formatMoney(target, envelope.currency)} fin ${formatMonthLabel(p.end_month.slice(0, 7))}`,
      })
      if (amount !== null && target >= amount) break
    }
  }

  // 2. Journal et primes qui en parlent
  const entries = plan.periods.flatMap((p) => [
    ...p.journal.map((j) => ({
      month: j.month ?? monthOfLabel(j.label),
      text: j.text,
      title: `${j.text} (${j.label})`,
    })),
    ...p.bonuses.map((b) => ({
      month: b.expected_month ?? (b.expected_label ? monthOfLabel(b.expected_label) : null),
      text: b.label,
      title: `${b.label} (${b.expected_month ? formatMonthLabel(b.expected_month.slice(0, 7)) : (b.expected_label ?? '')})`,
    })),
  ])
  const frequency = new Map<string, number>()
  for (const e of entries)
    for (const w of words(e.text)) frequency.set(w, (frequency.get(w) ?? 0) + 1)
  for (const e of entries) {
    if (!e.month || e.month > deadline) continue
    const shared = [...words(e.text)].filter((w) => goalWords.has(w))
    const rare = shared.some((w) => (frequency.get(w) ?? 0) <= 3)
    if (shared.length === 0 || (!rare && shared.length < 2)) continue
    // la ligne qui redit l'objectif lui-même n'est pas un jalon
    if ([...words(e.text)].every((w) => goalWords.has(w))) continue
    steps.push({ month: e.month, title: e.title.replace(/\s*\(\)$/, '') })
  }

  const seen = new Set<string>()
  return steps
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((s) => s.title.slice(0, 160))
    .filter((t) => !seen.has(fold(t)) && Boolean(seen.add(fold(t))))
    .slice(0, 8)
}
