import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProgressBar, Select, useToast, type SelectOption } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Category, Expense, Income } from '@/features/budget/types'
import { useBudget } from '@/features/budget/useBudget'
import { balanceOf } from '@/features/savings/savingsLogic'
import { useSavings } from '@/features/savings/useSavings'
import { formatDayMonth, formatMonthLabel, monthOf, todayISO } from '@/lib/dates'
import { parseAmountToCents } from '@/lib/money'
import { PlanImportCard } from './PlanImportCard'
import {
  convert,
  currentPeriod,
  envelopeTarget,
  formatMoney,
  lineActive,
  monthStart,
  periodMonths,
  periodProgress,
  plannedMonth,
  realMonth,
  realOfLine,
  totalsByCurrency,
} from './planLogic'
import type { Currency, Plan, PlanBonus, PlanLine, PlanPeriod } from './types'
import { usePlan, usePlanReal } from './usePlan'

const h2 = 'text-xs font-semibold text-muted uppercase'
const field = 'field min-h-11 px-3 md:min-h-9'
const small =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9'

const shortMonth = (month: string) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(`${month}T12:00:00Z`))
    .replace('.', '')

/** Prévu face au réel, avec l'écart signé (vert si mieux que prévu). */
function VersusRow({
  label,
  planned,
  real,
  currency,
  higherIsBetter,
}: {
  label: string
  planned: number
  real: number
  currency: Currency
  higherIsBetter: boolean
}) {
  const gap = real - planned
  const good = higherIsBetter ? gap >= 0 : gap <= 0
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
      <span>{label}</span>
      <span className="text-right tabular-nums">
        <span className="font-semibold">{formatMoney(real, currency)}</span>
        <span className="text-muted"> / {formatMoney(planned, currency)} prévus</span>
        {real !== 0 && gap !== 0 && (
          <span className={`block text-xs ${good ? 'text-success' : 'text-danger'}`}>
            {gap > 0 ? '+' : '−'}
            {formatMoney(Math.abs(gap), currency)}
          </span>
        )}
      </span>
    </div>
  )
}

/** Le mois en cours : revenus, dépenses et surplus prévus face au budget réel. */
function ThisMonth({
  period,
  lines,
  incomes,
  expenses,
  month,
}: {
  period: PlanPeriod
  lines: PlanLine[]
  incomes: Income[]
  expenses: Expense[]
  month: string
}) {
  const own = lines.filter((l) => l.period_id === period.id)
  const planned = plannedMonth(own, month)
  const real = realMonth(incomes, expenses, month)
  return (
    <section aria-labelledby="plan-month" className="card mb-4 flex flex-col gap-2 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="plan-month" className={h2}>
          {formatMonthLabel(month.slice(0, 7))}
        </h2>
        <span className="text-xs text-muted">{period.label}</span>
      </div>
      <div className="text-sm">
        <VersusRow
          label="Revenus"
          planned={planned.income}
          real={real.income}
          currency={period.currency}
          higherIsBetter
        />
        <VersusRow
          label="Dépenses"
          planned={planned.expense}
          real={real.expense}
          currency={period.currency}
          higherIsBetter={false}
        />
        <VersusRow
          label="Surplus"
          planned={planned.surplus}
          real={real.surplus}
          currency={period.currency}
          higherIsBetter
        />
      </div>
      <p className="text-xs text-muted">
        Le réel vient de ton{' '}
        <Link to="/budget" className="text-accent">
          budget
        </Link>{' '}
        (revenus et dépenses du mois, primes reçues comprises).
      </p>
    </section>
  )
}

/** Un poste : montant prévu modifiable, catégorie du budget qui en donne le réel. */
function LineRow({
  line,
  currency,
  month,
  expenses,
  categoryOptions,
  onUpdate,
}: {
  line: PlanLine
  currency: Currency
  month: string | null
  expenses: Expense[]
  categoryOptions: SelectOption<string>[]
  onUpdate: (values: Partial<PlanLine>) => void
}) {
  const [invalid, setInvalid] = useState(false)
  const real = month ? realOfLine(line, expenses, month) : null
  const range =
    line.first_month || line.last_month
      ? `${line.first_month ? shortMonth(line.first_month) : '…'}→${line.last_month ? shortMonth(line.last_month) : '…'}`
      : null
  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-b-0">
      <span className="min-w-0 flex-1 basis-full sm:basis-40">
        {line.label}
        {range && <span className="text-xs text-muted"> · {range}</span>}
        {real !== null && (
          <span
            className={`block text-xs ${real > line.monthly_cents ? 'text-danger' : 'text-muted'}`}
          >
            Ce mois-ci : {formatMoney(real, currency)}
          </span>
        )}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {line.kind === 'expense' && (
          <Select
            label={`Catégorie du budget pour « ${line.label} »`}
            value={line.category_id ?? ''}
            options={categoryOptions}
            onChange={(v) => onUpdate({ category_id: v || null })}
            className={`${field} max-w-44 text-xs`}
          />
        )}
        <input
          key={`${line.id}-${line.monthly_cents}`}
          inputMode="decimal"
          defaultValue={String(line.monthly_cents / 100).replace('.', ',')}
          aria-label={`Montant prévu par mois pour « ${line.label} »`}
          aria-invalid={invalid}
          onBlur={(e) => {
            const cents = parseAmountToCents(e.target.value || '0')
            setInvalid(cents === null)
            if (cents !== null && cents !== line.monthly_cents) onUpdate({ monthly_cents: cents })
          }}
          className={`${field} w-24 text-right tabular-nums aria-[invalid=true]:border-danger`}
        />
      </span>
    </li>
  )
}

function BonusRow({
  bonus,
  currency,
  onReceived,
}: {
  bonus: PlanBonus
  currency: Currency
  onReceived: (bonus: PlanBonus, cents: number, on: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(
    String(Math.abs(bonus.planned_cents) / 100).replace('.', ','),
  )
  const [on, setOn] = useState(todayISO())
  const done = bonus.received_cents !== null
  const cost = bonus.planned_cents < 0
  const when = bonus.expected_month
    ? formatMonthLabel(bonus.expected_month.slice(0, 7))
    : bonus.expected_label
  return (
    <li className="border-b border-border py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 basis-40">
          <span className={done ? 'text-muted line-through' : ''}>{bonus.label}</span>
          {when && <span className="block text-xs text-muted">{when}</span>}
        </span>
        <span className="tabular-nums">
          {bonus.planned_cents !== 0 && formatMoney(bonus.planned_cents, currency)}
        </span>
        {done ? (
          <span className="text-xs text-success">
            {cost ? 'Payé' : 'Reçu'} {formatMoney(Math.abs(bonus.received_cents!), currency)}
            {bonus.received_on && ` le ${formatDayMonth(bonus.received_on)}`}
          </span>
        ) : (
          bonus.planned_cents !== 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={`${cost ? 'Noter comme payé' : 'Marquer comme reçue'} : « ${bonus.label} »`}
              onClick={() => setOpen(!open)}
              className={small}
            >
              {cost ? 'Payé ?' : 'Reçue ?'}
            </button>
          )
        )}
      </div>
      {open && !done && (
        <form
          className="mt-2 flex flex-wrap items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            const cents = parseAmountToCents(amount)
            if (cents === null || cents <= 0) return
            setOpen(false)
            onReceived(bonus, cost ? -cents : cents, on)
          }}
        >
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label={`Montant ${cost ? 'payé' : 'reçu'}`}
            className={`${field} w-28 text-right`}
          />
          <input
            type="date"
            value={on}
            onChange={(e) => setOn(e.target.value || todayISO())}
            aria-label={`Date ${cost ? 'du paiement' : 'de réception'}`}
            className={field}
          />
          <button
            type="submit"
            className="btn-primary min-h-11 px-4 text-sm font-semibold md:min-h-9"
          >
            Valider
          </button>
          {!cost && (
            <span className="w-full text-xs text-muted">
              Ajoutée aussi à tes revenus du budget.
            </span>
          )}
        </form>
      )}
    </li>
  )
}

/** Une période : progression, mois par mois, postes, primes et notes. */
function PeriodDetail({
  plan,
  period,
  thisMonth,
  incomes,
  expenses,
  categories,
  onError,
}: {
  plan: Plan
  period: PlanPeriod
  thisMonth: string
  incomes: Income[]
  expenses: Expense[]
  categories: Category[]
  onError: (m: string) => void
}) {
  const toast = useToast()
  const { update, markReceived } = usePlan({ onError })
  const lines = plan.lines.filter((l) => l.period_id === period.id)
  const bonuses = plan.bonuses.filter((b) => b.period_id === period.id)
  const progress = periodProgress(period, plan.lines, plan.bonuses, incomes, expenses, thisMonth)
  const months = periodMonths(period)
  const target = period.savings_target_cents ?? progress.plannedTotal
  const month = months.includes(thisMonth) ? thisMonth : null
  const categoryOptions: SelectOption<string>[] = [
    { value: '', label: 'Non suivie' },
    ...categories.filter((c) => !c.archived).map((c) => ({ value: c.id, label: c.name })),
  ]
  const cur = period.currency

  return (
    <div className="flex flex-col gap-5">
      {progress.status !== 'future' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              Épargné :{' '}
              <span className="font-semibold">{formatMoney(progress.realToDate, cur)}</span>
            </span>
            <span className="text-muted">objectif {formatMoney(target, cur)}</span>
          </div>
          <ProgressBar
            ratio={target > 0 ? Math.min(1, Math.max(0, progress.realToDate / target)) : 0}
            over={false}
            label={`Épargne de la période ${period.label}`}
          />
          <p className="text-xs text-muted">
            {progress.status === 'current'
              ? `Mois ${progress.elapsed} sur ${progress.months} · prévu à ce jour : ${formatMoney(progress.plannedToDate, cur)}`
              : `Période terminée · prévu : ${formatMoney(progress.plannedTotal, cur)}`}
          </p>
        </div>
      )}

      <section aria-label={`Mois de ${period.label}`}>
        <h3 className={`${h2} mb-1`}>Surplus mois par mois</h3>
        <ol className="grid grid-cols-3 gap-1 text-center text-xs sm:grid-cols-6">
          {months.map((m) => {
            const planned = plannedMonth(lines, m).surplus
            const real = m <= thisMonth ? realMonth(incomes, expenses, m).surplus : null
            return (
              <li
                key={m}
                className={`rounded-xl p-1.5 ${m === thisMonth ? 'ring-2 ring-accent' : ''} bg-surface/40`}
              >
                <span className="block text-muted first-letter:uppercase">{shortMonth(m)}</span>
                <span className="block font-semibold tabular-nums">
                  {real === null ? '—' : formatMoney(real, cur)}
                </span>
                <span className="block text-muted tabular-nums">{formatMoney(planned, cur)}</span>
              </li>
            )
          })}
        </ol>
        <p className="mt-1 text-xs text-muted">En gras le réel, dessous le prévu.</p>
      </section>

      {(['income', 'expense'] as const).map((kind) => {
        const items = lines.filter((l) => l.kind === kind)
        if (items.length === 0) return null
        return (
          <section
            key={kind}
            aria-label={`${kind === 'income' ? 'Revenus prévus' : 'Dépenses prévues'} de ${period.label}`}
          >
            <h3 className={h2}>
              {kind === 'income' ? 'Revenus prévus / mois' : 'Dépenses prévues / mois'}
            </h3>
            <ul className="text-sm">
              {items.map((l) => (
                <LineRow
                  key={l.id}
                  line={l}
                  currency={cur}
                  month={month && lineActive(l, month) ? month : null}
                  expenses={expenses}
                  categoryOptions={categoryOptions}
                  onUpdate={(values) => update('lines', l.id, values)}
                />
              ))}
            </ul>
          </section>
        )
      })}

      {bonuses.length > 0 && (
        <section aria-label={`Primes et exceptionnels de ${period.label}`}>
          <h3 className={h2}>Primes et exceptionnels</h3>
          <ul className="text-sm">
            {bonuses.map((b) => (
              <BonusRow
                key={b.id}
                bonus={b}
                currency={cur}
                onReceived={(bonus, cents, on) =>
                  void markReceived(bonus, cents, on).then((undo) =>
                    toast.show(
                      cents > 0 ? 'Prime reçue, ajoutée aux revenus' : 'Frais noté comme payé',
                      undo,
                    ),
                  )
                }
              />
            ))}
          </ul>
        </section>
      )}

      {period.notes && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-accent md:min-h-9">
            Notes et journal
          </summary>
          <p className="text-sm whitespace-pre-line text-muted">{period.notes}</p>
        </details>
      )}
    </div>
  )
}

/** Toutes les périodes : épargne réelle face à l'objectif, totaux par devise. */
function Trajectory({
  plan,
  thisMonth,
  incomes,
  expenses,
  rateMilli,
  onRate,
  onSelect,
}: {
  plan: Plan
  thisMonth: string
  incomes: Income[]
  expenses: Expense[]
  rateMilli: number
  onRate: (milli: number) => void
  onSelect: (id: string) => void
}) {
  const rows = plan.periods.map((p) =>
    periodProgress(p, plan.lines, plan.bonuses, incomes, expenses, thisMonth),
  )
  const targets = totalsByCurrency(
    rows.map((r) => ({
      currency: r.period.currency,
      cents: r.period.savings_target_cents ?? r.plannedTotal,
    })),
  )
  const real = totalsByCurrency(
    rows.map((r) => ({ currency: r.period.currency, cents: r.realToDate })),
  )
  const inCad = (t: Record<Currency, number>) => t.CAD + convert(t.EUR, 'EUR', 'CAD', rateMilli)
  const [rate, setRate] = useState(String(rateMilli / 1000).replace('.', ','))

  return (
    <section aria-labelledby="plan-trajectory" className="card mb-4 flex flex-col gap-3 p-5">
      <h2 id="plan-trajectory" className={h2}>
        Trajectoire d’épargne
      </h2>
      <ul className="text-sm">
        {rows.map(({ period, status, realToDate, plannedTotal }) => {
          const target = period.savings_target_cents ?? plannedTotal
          return (
            <li key={period.id}>
              <button
                type="button"
                onClick={() => onSelect(period.id)}
                aria-label={`Voir la période ${period.label}`}
                className="flex min-h-11 w-full items-center gap-2 border-b border-border py-1.5 text-left transition-colors hover:bg-surface/40"
              >
                <span className="min-w-0 flex-1">
                  <span className={status === 'current' ? 'font-semibold' : ''}>
                    {period.label}
                  </span>
                  {period.age_label && (
                    <span className="text-xs text-muted"> · {period.age_label}</span>
                  )}
                </span>
                <span className="text-right text-xs tabular-nums">
                  {status === 'future' ? (
                    <span className="text-muted">
                      objectif {formatMoney(target, period.currency)}
                    </span>
                  ) : (
                    <>
                      <span className="font-semibold">
                        {formatMoney(realToDate, period.currency)}
                      </span>
                      <span className="text-muted"> / {formatMoney(target, period.currency)}</span>
                    </>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-col gap-1 text-sm">
        <p>
          Objectif total : {formatMoney(targets.EUR, 'EUR')} + {formatMoney(targets.CAD, 'CAD')}{' '}
          <span className="text-muted">≈ {formatMoney(inCad(targets), 'CAD')}</span>
        </p>
        <p>
          Épargné à ce jour : <span className="font-semibold">{formatMoney(real.EUR, 'EUR')}</span>
          {real.CAD !== 0 && ` + ${formatMoney(real.CAD, 'CAD')}`}
        </p>
        <label className="flex flex-wrap items-center gap-2 text-xs text-muted">
          Taux de conversion : 1 € =
          <input
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            onBlur={() => {
              const value = Number(rate.replace(',', '.'))
              const milli = Math.round(value * 1000)
              if (milli >= 100 && milli <= 10000 && milli !== rateMilli) onRate(milli)
              else setRate(String(rateMilli / 1000).replace('.', ','))
            }}
            aria-label="Taux de conversion d’un euro en dollars canadiens"
            className={`${field} w-20 text-right text-text`}
          />
          CAD
        </label>
      </div>
    </section>
  )
}

/** Enveloppes : solde visé pour la période, solde réel depuis la cagnotte reliée. */
function Envelopes({
  plan,
  period,
  onError,
}: {
  plan: Plan
  period: PlanPeriod
  onError: (m: string) => void
}) {
  const { update } = usePlan({ onError })
  const { goals: savings, moves } = useSavings({ onError })
  const options: SelectOption<string>[] = [
    { value: '', label: 'Pas de cagnotte' },
    ...savings.filter((s) => !s.archived).map((s) => ({ value: s.id, label: s.name })),
  ]
  const rows = plan.envelopes
    .map((e) => ({ e, target: envelopeTarget(plan.targets, plan.periods, e.id, period) }))
    .filter((r) => r.target !== null || r.e.savings_id)
  if (rows.length === 0) return null

  return (
    <section aria-labelledby="plan-envelopes" className="card mb-4 flex flex-col gap-2 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="plan-envelopes" className={h2}>
          Enveloppes
        </h2>
        <span className="text-xs text-muted">objectifs fin {period.label}</span>
      </div>
      <ul className="text-sm">
        {rows.map(({ e, target }) => {
          const balance = e.savings_id ? balanceOf(moves, e.savings_id) : null
          return (
            <li
              key={e.id}
              className="flex flex-col gap-1.5 border-b border-border py-2 last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 basis-32 font-semibold">{e.name}</span>
                <Select
                  label={`Cagnotte reliée à « ${e.name} »`}
                  value={e.savings_id ?? ''}
                  options={options}
                  onChange={(v) => update('envelopes', e.id, { savings_id: v || null })}
                  className={`${field} max-w-44 text-xs`}
                />
              </div>
              <div className="flex items-baseline justify-between text-xs tabular-nums">
                <span>{balance === null ? '—' : formatMoney(balance, e.currency)}</span>
                <span className="text-muted">
                  {target !== null && `objectif ${formatMoney(target, e.currency)}`}
                </span>
              </div>
              {balance !== null && target !== null && target > 0 && (
                <ProgressBar
                  ratio={Math.min(1, Math.max(0, balance / target))}
                  over={false}
                  label={`Enveloppe ${e.name}`}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Plan financier pluriannuel : prévu (importé du classeur) face au réel (le budget de l'app). */
export default function PlanPage() {
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const today = todayISO()
  const thisMonth = monthStart(today)
  const { plan, isLoading, isError, rateMilli, setRate } = usePlan({ onError })
  const { categories } = useBudget(monthOf(today), { onError })
  const first = plan?.periods[0]?.start_month ?? null
  const { incomes, expenses } = usePlanReal(first, today)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reimport, setReimport] = useState(false)

  if (isLoading)
    return (
      <>
        <PageHeader title="Plan financier" />
        <div aria-hidden className="h-40 animate-pulse rounded-3xl bg-surface" />
      </>
    )
  if (isError || !plan)
    return (
      <>
        <PageHeader title="Plan financier" />
        <p className="text-muted">Le plan n’a pas pu être chargé.</p>
      </>
    )
  if (plan.periods.length === 0)
    return (
      <>
        <PageHeader title="Plan financier" />
        <PlanImportCard replacing={false} onError={onError} />
      </>
    )

  const current = currentPeriod(plan.periods, thisMonth)!
  const selected = plan.periods.find((p) => p.id === selectedId) ?? current
  const periodOptions: SelectOption<string>[] = plan.periods.map((p) => ({
    value: p.id,
    label: `${p.label}${p.id === current.id ? ' (en cours)' : ''}`,
  }))
  const inPlan = periodMonths(current).includes(thisMonth)

  return (
    <>
      <PageHeader title="Plan financier" />
      {inPlan && (
        <ThisMonth
          period={current}
          lines={plan.lines}
          incomes={incomes}
          expenses={expenses}
          month={thisMonth}
        />
      )}

      <section aria-labelledby="plan-period" className="card mb-4 flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="plan-period" className={h2}>
            Période
          </h2>
          <Select
            label="Période affichée"
            value={selected.id}
            options={periodOptions}
            onChange={setSelectedId}
            className={field}
          />
        </div>
        <PeriodDetail
          key={selected.id}
          plan={plan}
          period={selected}
          thisMonth={thisMonth}
          incomes={incomes}
          expenses={expenses}
          categories={categories}
          onError={onError}
        />
      </section>

      <Trajectory
        plan={plan}
        thisMonth={thisMonth}
        incomes={incomes}
        expenses={expenses}
        rateMilli={rateMilli}
        onRate={setRate}
        onSelect={(id) => {
          setSelectedId(id)
          document.getElementById('plan-period')?.scrollIntoView?.({ behavior: 'smooth' })
        }}
      />
      <Envelopes plan={plan} period={selected} onError={onError} />

      {reimport ? (
        <PlanImportCard replacing onDone={() => setReimport(false)} onError={onError} />
      ) : (
        <button type="button" onClick={() => setReimport(true)} className={small}>
          Réimporter le classeur…
        </button>
      )}
    </>
  )
}
