import { useState, type ChangeEvent } from 'react'
import { Button, Checkbox, useToast } from '@/components/ui'
import { useGoals } from '@/features/goals/useGoals'
import { useSavings } from '@/features/savings/useSavings'
import { formatMonthLabel, todayISO } from '@/lib/dates'
import { readXlsx, XlsxError } from '@/lib/xlsx'
import { parsePlanWorkbook, PlanImportError, type PlanImport } from './importPlan'
import { importRows } from './importRows'
import { usePlan } from './usePlan'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`

/** Importer (ou remplacer) le plan depuis le classeur Excel : aperçu, puis confirmation. */
export function PlanImportCard({
  replacing,
  onDone,
  onError,
}: {
  replacing: boolean
  onDone?: () => void
  onError: (m: string) => void
}) {
  const toast = useToast()
  const { importPlan, isImporting } = usePlan({ onError })
  const { goals: savings } = useSavings({ onError })
  const { goals } = useGoals({ onError })
  const [parsed, setParsed] = useState<{ name: string; plan: PlanImport } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [createSavings, setCreateSavings] = useState(true)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProblem(null)
    setParsed(null)
    try {
      const plan = parsePlanWorkbook(await readXlsx(await file.arrayBuffer()))
      setParsed({ name: file.name, plan })
    } catch (error) {
      setProblem(
        error instanceof XlsxError || error instanceof PlanImportError
          ? error.message
          : 'Lecture du fichier impossible. Est-ce bien le classeur du suivi financier (.xlsx) ?',
      )
    }
  }

  const rows =
    parsed &&
    importRows(
      parsed.plan,
      { savings, goals, savingsCount: savings.length },
      { createSavings, today: todayISO() },
    )

  async function confirm() {
    if (!rows) return
    try {
      await importPlan(rows)
      toast.show(
        `Plan importé : ${plural(rows.periods.length, 'période')}, ${plural(rows.goals.length, 'objectif')} ajouté${rows.goals.length > 1 ? 's' : ''}`,
      )
      setParsed(null)
      onDone?.()
    } catch {
      /* message déjà affiché par usePlan */
    }
  }

  const first = parsed?.plan.periods[0]
  const last = parsed?.plan.periods.at(-1)

  return (
    <section aria-labelledby="plan-import" className="card flex flex-col gap-3 p-5">
      <h2 id="plan-import" className="font-semibold">
        {replacing ? 'Réimporter le classeur' : 'Importer ton plan'}
      </h2>
      <p className="text-sm text-muted">
        Le classeur « Suivi financier » (.xlsx) : un onglet RECAP et un onglet par période. Il est
        lu dans ton navigateur ; seuls le prévu, les primes, les enveloppes et les objectifs sont
        enregistrés. Le réel viendra de ton budget.
        {replacing && ' Le plan actuel sera remplacé (tes dépenses, revenus et cagnottes restent).'}
      </p>
      <label className="self-start">
        <span className="sr-only">Classeur Excel du plan</span>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => void onFile(e)}
          className="text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-full file:border file:border-[var(--field-border)] file:bg-bg file:px-4 file:text-sm file:text-text md:file:min-h-9"
        />
      </label>
      {problem && (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      )}
      {parsed && rows && first && last && (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 text-sm">
          <p className="font-semibold">« {parsed.name} » compris :</p>
          <ul className="list-disc pl-5" aria-label="Contenu du classeur">
            <li>
              {plural(rows.periods.length, 'période')}, de{' '}
              {formatMonthLabel(first.start_month.slice(0, 7))} à{' '}
              {formatMonthLabel(last.end_month.slice(0, 7))}
            </li>
            <li>
              {plural(rows.lines.length, 'poste')} prévu{rows.lines.length > 1 ? 's' : ''},{' '}
              {plural(rows.bonuses.length, 'prime ou exceptionnel', 'primes ou exceptionnels')}
            </li>
            <li>{plural(rows.envelopes.length, 'enveloppe')} d’épargne ou de patrimoine</li>
            <li>
              {plural(parsed.plan.goals.length, 'objectif clé', 'objectifs clés')}
              {parsed.plan.goals.length > rows.goals.length &&
                ` (${parsed.plan.goals.length - rows.goals.length} déjà dans Objectifs)`}
            </li>
          </ul>
          <Checkbox
            label="Créer les cagnottes en euros qui manquent (ex. Livret A)"
            checked={createSavings}
            onChange={(e) => setCreateSavings(e.target.checked)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void confirm()} disabled={isImporting}>
              {isImporting ? 'Import…' : replacing ? 'Remplacer le plan' : 'Importer'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setParsed(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
