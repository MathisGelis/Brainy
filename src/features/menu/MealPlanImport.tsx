import { useQueryClient } from '@tanstack/react-query'
import { useState, type ChangeEvent } from 'react'
import { Button, Checkbox, Select, useToast, type SelectOption } from '@/components/ui'
import { addDays, formatDayMonth, startOfWeek, todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/schemaErrors'
import { CATALOG } from './catalog'
import { writeMealPlan } from './mealPlanImport'
import { MEAL_PLAN_TEMPLATE, parseMealPlanMd, type MealPlanMd } from './mealPlanMd'
import { resolveMealPlan } from './mealPlanResolve'
import {
  FOODS_KEY,
  RECIPES_KEY,
  TARGETS_KEY,
  useFoods,
  useMacroTargets,
  useRecipes,
} from './useMenu'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`

/** Télécharge le modèle .md à remplir (à la main ou par un assistant). */
function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([MEAL_PLAN_TEMPLATE], { type: 'text/markdown' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'plan-repas.md'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Importer un plan de repas écrit en Markdown : aliments et macros, recettes, repas jour par jour
 * (« lundi on mange ça »), objectifs. Aperçu de ce qui sera fait, puis enregistrement.
 */
export function MealPlanImport({ onError }: { onError: (m: string) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { foods } = useFoods({ onError })
  const { recipes } = useRecipes({ onError })
  const { targets } = useMacroTargets({ onError })
  const [file, setFile] = useState<{ name: string; md: MealPlanMd } | null>(null)
  const thisMonday = startOfWeek(todayISO())
  const [monday, setMonday] = useState(thisMonday)
  const [weeks, setWeeks] = useState('1')
  const [replace, setReplace] = useState(true)
  // Type choisi pour chaque semaine (index → lettre, '' = aucun) ; à défaut, A, B, A, B…
  const [choices, setChoices] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)

  const mondays: SelectOption<string>[] = [0, 1, 2, 3].map((w) => {
    const m = addDays(thisMonday, 7 * w)
    return {
      value: m,
      label: `${w === 0 ? 'Cette semaine' : w === 1 ? 'Semaine prochaine' : `Semaine du ${formatDayMonth(m)}`} (lun. ${formatDayMonth(m)})`,
    }
  })
  const repeats: SelectOption<string>[] = ['1', '2', '3', '4', '6', '8'].map((n) => ({
    value: n,
    label: n === '1' ? '1 semaine' : `${n} semaines`,
  }))

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setFile({ name: f.name, md: parseMealPlanMd(await f.text()) })
  }

  // Types de semaine du fichier (« A », « B »…) : chaque semaine importée reçoit le sien
  const types = [
    ...new Set(file?.md.days.map((d) => d.cycle).filter((c): c is string => c !== null)),
  ].sort()
  const hasCommon = Boolean(file?.md.days.some((d) => d.cycle === null && d.key.kind !== 'date'))
  const weekTypes = Array.from({ length: Number(weeks) }, (_, w) =>
    types.length === 0 ? null : (choices[w] ?? types[w % types.length]!) || null,
  )
  const typeOptions: SelectOption<string>[] = [
    ...types.map((t) => ({ value: t, label: `Semaine ${t}` })),
    { value: '', label: hasCommon ? 'Aucune (jours communs seulement)' : 'Rien cette semaine' },
  ]
  const plan =
    file &&
    resolveMealPlan(
      file.md,
      { foods, recipes, catalog: CATALOG },
      { monday, weeks: Number(weeks), weekTypes },
    )
  const empty =
    plan &&
    plan.mealItems.length === 0 &&
    plan.recipes.length === 0 &&
    plan.newFoods.length === 0 &&
    !plan.targets

  async function confirm() {
    if (!plan) return
    setSaving(true)
    try {
      await writeMealPlan(plan, { replace, currentTargets: targets })
      toast.show(
        `Plan importé : ${plural(plan.mealItems.length, 'élément')} sur ${plural(plan.days.length, 'jour')}`,
      )
      setFile(null)
    } catch (error) {
      onError(saveErrorMessage(error))
    } finally {
      setSaving(false)
      await Promise.all(
        [FOODS_KEY, RECIPES_KEY, TARGETS_KEY, ['meal_items']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      )
    }
  }

  return (
    <details className="card mb-4 p-4">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold md:min-h-9">
        Importer un plan de repas (.md)
      </summary>
      <div className="mt-2 flex flex-col gap-3 text-sm">
        <p className="text-muted">
          Un fichier Markdown avec vos aliments et leurs macros, vos recettes, et les repas jour par
          jour (« Lundi : … »). Les jours de la semaine se répètent sur les semaines choisies.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label>
            <span className="sr-only">Fichier du plan de repas</span>
            <input
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              onChange={(e) => void onFile(e)}
              className="text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-full file:border file:border-[var(--field-border)] file:bg-bg file:px-4 file:text-sm file:text-text md:file:min-h-9"
            />
          </label>
          <button
            type="button"
            onClick={downloadTemplate}
            className="min-h-11 rounded-full px-3 text-xs text-accent transition-colors hover:bg-surface md:min-h-9"
          >
            Télécharger le modèle
          </button>
        </div>

        {file && plan && (
          <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
            <p className="font-semibold">« {file.name} » compris :</p>
            {empty ? (
              <p className="text-danger">Rien d’utilisable dans ce fichier. Partez du modèle.</p>
            ) : (
              <ul aria-label="Contenu du plan" className="list-disc pl-5">
                {plan.mealItems.length > 0 && (
                  <li>
                    {plural(plan.mealItems.length, 'élément')} de repas sur{' '}
                    {plural(plan.days.length, 'jour')}
                    {plan.days.length > 0 &&
                      `, du ${formatDayMonth(plan.days[0]!)} au ${formatDayMonth(plan.days.at(-1)!)}`}
                  </li>
                )}
                {plan.recipes.length > 0 && (
                  <li>
                    {plural(plan.recipes.length, 'recette')}
                    {plan.recipes.some((r) => r.replaces) &&
                      ` (dont ${plan.recipes.filter((r) => r.replaces).length} remplacée${plan.recipes.filter((r) => r.replaces).length > 1 ? 's' : ''})`}
                  </li>
                )}
                {(plan.newFoods.length > 0 || plan.updatedFoods.length > 0) && (
                  <li>
                    {plural(plan.newFoods.length, 'aliment')} ajouté
                    {plan.newFoods.length > 1 ? 's' : ''}
                    {plan.updatedFoods.length > 0 &&
                      `, ${plural(plan.updatedFoods.length, 'aliment')} mis à jour (${plan.updatedFoods.map((f) => f.name).join(', ')})`}
                  </li>
                )}
                {plan.targets && (
                  <li>
                    Objectifs :{' '}
                    {[
                      plan.targets.kcal != null && `${plan.targets.kcal} kcal`,
                      plan.targets.protein_g != null && `P ${plan.targets.protein_g} g`,
                      plan.targets.carbs_g != null && `G ${plan.targets.carbs_g} g`,
                      plan.targets.fat_g != null && `L ${plan.targets.fat_g} g`,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </li>
                )}
              </ul>
            )}
            {plan.notes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase">À vérifier</p>
                <ul className="list-disc pl-5 text-xs">
                  {plan.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.problems.length > 0 && (
              <div role="alert">
                <p className="text-xs font-semibold text-danger uppercase">Ignoré</p>
                <ul className="list-disc pl-5 text-xs">
                  {plan.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {file.md.days.some((d) => d.key.kind !== 'date') && (
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  label="Semaine de départ"
                  value={monday}
                  onChange={setMonday}
                  options={mondays}
                  className="field min-h-11 px-3 md:min-h-9"
                />
                <Select
                  label="Nombre de semaines"
                  value={weeks}
                  onChange={setWeeks}
                  options={repeats}
                  className="field min-h-11 px-3 md:min-h-9"
                />
              </div>
            )}
            {types.length > 0 && (
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 text-xs font-semibold text-muted uppercase">
                  Type de chaque semaine
                </legend>
                {weekTypes.map((t, w) => {
                  const m = addDays(monday, 7 * w)
                  return (
                    <div key={m} className="flex flex-wrap items-center justify-between gap-2">
                      <span>Semaine du {formatDayMonth(m)}</span>
                      <Select
                        label={`Type de la semaine du ${formatDayMonth(m)}`}
                        value={t ?? ''}
                        onChange={(v) => setChoices((c) => ({ ...c, [w]: v }))}
                        options={typeOptions}
                        className="field min-h-11 px-3 md:min-h-9"
                      />
                    </div>
                  )
                })}
              </fieldset>
            )}
            <Checkbox
              label="Remplacer les repas déjà prévus ces jours-là"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void confirm()}
                disabled={saving || Boolean(empty)}
              >
                {saving ? 'Import…' : 'Importer'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFile(null)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    </details>
  )
}
