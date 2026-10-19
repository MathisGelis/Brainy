import { useState } from 'react'
import { ProgressBar } from '@/components/ui'
import type { MacroTargets, Macros } from './types'

const field = 'field min-h-11 w-24 px-3 text-text md:min-h-10'

const ROWS = [
  { key: 'protein_g', dg: 'protein_dg', label: 'Protéines' },
  { key: 'carbs_g', dg: 'carbs_dg', label: 'Glucides' },
  { key: 'fat_g', dg: 'fat_dg', label: 'Lipides' },
] as const

function TargetsForm({
  targets,
  onSave,
}: {
  targets: MacroTargets
  onSave: (t: MacroTargets) => void
}) {
  const [invalid, setInvalid] = useState<string | null>(null)
  const fields = [
    { key: 'kcal', label: 'kcal', max: 10000 },
    { key: 'protein_g', label: 'Protéines (g)', max: 1000 },
    { key: 'carbs_g', label: 'Glucides (g)', max: 1000 },
    { key: 'fat_g', label: 'Lipides (g)', max: 1000 },
  ] as const
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-xs text-muted">
            {f.label}
            <input
              defaultValue={targets[f.key] ?? ''}
              inputMode="numeric"
              placeholder="—"
              aria-invalid={invalid === f.key}
              onBlur={(e) => {
                const raw = e.target.value.trim()
                const n = raw === '' ? null : Number(raw)
                const ok =
                  n === null ||
                  (Number.isInteger(n) && n >= (f.key === 'kcal' ? 500 : 0) && n <= f.max)
                setInvalid(ok ? null : f.key)
                if (ok && n !== targets[f.key]) onSave({ ...targets, [f.key]: n })
              }}
              className={`${field} ${invalid === f.key ? '!border-danger' : ''}`}
            />
          </label>
        ))}
      </div>
      {invalid && (
        <p role="alert" className="text-xs text-danger">
          Nombre entier attendu{invalid === 'kcal' ? ' (500 à 10 000 kcal)' : ''}.
        </p>
      )}
    </div>
  )
}

/** Tracker du jour : kcal et macros face aux objectifs. */
export function MacroSummary({
  totals,
  targets,
  hasTargets,
  onSaveTargets,
}: {
  totals: Macros
  targets: MacroTargets
  hasTargets: boolean
  onSaveTargets: (t: MacroTargets) => void
}) {
  const [editing, setEditing] = useState(false)
  const kcalOver = targets.kcal !== null && totals.kcal > targets.kcal

  return (
    <section aria-label="Macros du jour" className="card mb-5 flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="text-[34px] leading-none font-semibold tracking-tight tabular-nums">
            {totals.kcal}
          </span>{' '}
          <span className="text-muted">
            {targets.kcal !== null ? `/ ${targets.kcal} kcal` : 'kcal'}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          aria-expanded={editing}
          className="min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-text md:min-h-9"
        >
          {hasTargets ? 'Objectifs' : 'Définir mes objectifs'}
        </button>
      </div>
      {targets.kcal !== null && (
        <>
          <ProgressBar
            ratio={Math.min(1, totals.kcal / targets.kcal)}
            over={kcalOver}
            label="Calories du jour"
          />
          <p className={`-mt-1 text-xs ${kcalOver ? 'text-danger' : 'text-muted'}`}>
            {kcalOver
              ? `${totals.kcal - targets.kcal} kcal au-dessus de l’objectif`
              : `Reste ${targets.kcal - totals.kcal} kcal`}
          </p>
        </>
      )}
      <ul className="grid gap-3 sm:grid-cols-3">
        {ROWS.map((r) => {
          const value = Math.round(totals[r.dg] / 10)
          const target = targets[r.key]
          return (
            <li key={r.key} className="flex flex-col gap-1">
              <span className="flex justify-between text-xs">
                <span>{r.label}</span>
                <span className="text-muted tabular-nums">
                  {value}
                  {target !== null ? ` / ${target}` : ''} g
                </span>
              </span>
              {target !== null && target > 0 && (
                <ProgressBar
                  ratio={Math.min(1, value / target)}
                  over={false}
                  label={`${r.label} du jour`}
                />
              )}
            </li>
          )
        })}
      </ul>
      {editing && <TargetsForm targets={targets} onSave={onSaveTargets} />}
    </section>
  )
}
