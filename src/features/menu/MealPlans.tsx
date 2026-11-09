import { useState, type ChangeEvent } from 'react'
import { Button, Select, useToast, type SelectOption } from '@/components/ui'
import { addDays, formatDayMonth, startOfWeek, todayISO } from '@/lib/dates'
import { CATALOG } from './catalog'
import { MEAL_PLAN_TEMPLATE, parseMealPlanMd, type MealPlanMd } from './mealPlanMd'
import { choiceValue, parseChoice, planTypes, previewPlan } from './mealPlans'
import type { MealPlan } from './types'
import { useMealPlans } from './useMealPlans'
import { useFoods, useMacroTargets, useRecipes } from './useMenu'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`
/** Semaines proposées au choix, à partir de celle en cours. */
const WEEKS_AHEAD = 6

/** Télécharge le modèle .md à remplir (à la main ou par un assistant). */
function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([MEAL_PLAN_TEMPLATE], { type: 'text/markdown' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'plan-repas.md'
  a.click()
  URL.revokeObjectURL(url)
}

const weekLabel = (w: number, monday: string) =>
  w === 0
    ? `Cette semaine (lun. ${formatDayMonth(monday)})`
    : w === 1
      ? `Semaine prochaine (lun. ${formatDayMonth(monday)})`
      : `Semaine du ${formatDayMonth(monday)}`

/** Aperçu d'un fichier lu, avant de l'ajouter aux plans. */
function PlanPreview({
  file,
  onAdd,
  onCancel,
  saving,
  onError,
}: {
  file: { name: string; content: string; md: MealPlanMd }
  onAdd: (name: string) => void
  onCancel: () => void
  saving: boolean
  onError: (m: string) => void
}) {
  const { foods } = useFoods({ onError })
  const { recipes } = useRecipes({ onError })
  const [name, setName] = useState(file.name.replace(/\.(md|markdown|txt)$/i, ''))
  const plan = previewPlan(file.md, { foods, recipes, catalog: CATALOG }, startOfWeek(todayISO()))
  const types = planTypes(file.md)
  const days = file.md.days.length
  const empty =
    days === 0 && plan.recipes.length === 0 && plan.newFoods.length === 0 && !plan.targets
  const replaced = plan.recipes.filter((r) => r.replaces).length

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <p className="font-semibold">« {file.name} » compris :</p>
      {empty ? (
        <p className="text-danger">Rien d’utilisable dans ce fichier. Partez du modèle.</p>
      ) : (
        <ul aria-label="Contenu du plan" className="list-disc pl-5">
          {days > 0 && (
            <li>
              {plural(days, 'jour')} de repas
              {types.length > 0 && `, semaines ${types.join(', ')}`}
            </li>
          )}
          {plan.recipes.length > 0 && (
            <li>
              {plural(plan.recipes.length, 'recette')}
              {replaced > 0 && ` (dont ${replaced} remplacée${replaced > 1 ? 's' : ''})`}
            </li>
          )}
          {(plan.newFoods.length > 0 || plan.updatedFoods.length > 0) && (
            <li>
              {plural(plan.newFoods.length, 'aliment')} ajouté{plan.newFoods.length > 1 ? 's' : ''}
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
            {[...new Set(plan.problems)].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Nom du plan</span>
        <input
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className="field min-h-11 px-3 md:min-h-9"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => onAdd(name.trim() || file.name)}
          disabled={saving || empty}
        >
          {saving ? 'Ajout…' : 'Ajouter aux plans'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

/**
 * Plans de repas : des fichiers Markdown gardés dans l'app (autant qu'on veut), et pour chaque
 * semaine à venir, le plan qu'on y suit (et son type de semaine A, B…), ou aucun.
 */
export function MealPlans({ onError }: { onError: (m: string) => void }) {
  const toast = useToast()
  const { targets } = useMacroTargets({ onError })
  const { plans, weeks, saving, addPlan, setWeekPlan, deletePlan } = useMealPlans({ onError })
  const [file, setFile] = useState<{ name: string; content: string; md: MealPlanMd } | null>(null)
  const thisMonday = startOfWeek(todayISO())
  const mondays = Array.from({ length: WEEKS_AHEAD }, (_, w) => addDays(thisMonday, 7 * w))

  const parsed = new Map(plans.map((p) => [p.id, parseMealPlanMd(p.content)]))
  const options: SelectOption<string>[] = [
    { value: '', label: 'Aucun plan' },
    ...plans.flatMap((p) => {
      const types = planTypes(parsed.get(p.id)!)
      return types.length === 0
        ? [{ value: choiceValue(p.id, null), label: p.name }]
        : types.map((t) => ({ value: choiceValue(p.id, t), label: `${p.name} · Semaine ${t}` }))
    }),
  ]
  const valueOf = (monday: string) => {
    const w = weeks.find((x) => x.monday === monday)
    return w ? choiceValue(w.plan_id, w.week_type) : ''
  }
  const current = options.find((o) => o.value && o.value === valueOf(thisMonday))

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const content = await f.text()
    setFile({ name: f.name, content, md: parseMealPlanMd(content) })
  }

  async function add(name: string) {
    if (!file) return
    try {
      await addPlan(name, file.content, targets)
      toast.show(`Plan « ${name} » ajouté : choisissez ses semaines`)
      setFile(null)
    } catch {
      // erreur déjà signalée par le hook
    }
  }

  async function choose(monday: string, value: string) {
    const choice = parseChoice(value)
    const plan = choice ? (plans.find((p) => p.id === choice.planId) ?? null) : null
    try {
      const { added, problems } = await setWeekPlan(monday, plan, choice?.weekType ?? null)
      const unknown = new Set(problems).size
      toast.show(
        plan
          ? `Semaine du ${formatDayMonth(monday)} : ${plural(added, 'repas', 'repas')} prévu${added > 1 ? 's' : ''}${unknown > 0 ? ` (${plural(unknown, 'ligne')} ignorée${unknown > 1 ? 's' : ''})` : ''}`
          : `Semaine du ${formatDayMonth(monday)} : plus de plan`,
      )
    } catch {
      // erreur déjà signalée par le hook
    }
  }

  function remove(plan: MealPlan) {
    toast.show(`Plan « ${plan.name} » supprimé`, deletePlan(plan))
  }

  return (
    <details className="card mb-4 p-4">
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 font-semibold md:min-h-9">
        Plans de repas
        {current && (
          <span className="text-sm font-normal text-muted">· cette semaine : {current.label}</span>
        )}
      </summary>
      <div className="mt-2 flex flex-col gap-4 text-sm">
        {plans.length > 0 && (
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-xs font-semibold text-muted uppercase">
              Plan de chaque semaine
            </legend>
            {mondays.map((m, w) => (
              <div key={m} className="flex flex-wrap items-center justify-between gap-2">
                <span>{weekLabel(w, m)}</span>
                <Select
                  label={`Plan de la semaine du ${formatDayMonth(m)}`}
                  value={valueOf(m)}
                  onChange={(v) => void choose(m, v)}
                  options={options}
                  className="field min-h-11 px-3 md:min-h-9"
                />
              </div>
            ))}
            <p className="text-xs text-muted">
              Changer de plan remplace les repas qu’il a posés et pas encore mangés, à partir
              d’aujourd’hui ; vos ajouts à la main restent.
            </p>
          </fieldset>
        )}

        {plans.length > 0 && (
          <div>
            <h3 className="mb-1 text-xs font-semibold text-muted uppercase">Mes plans</h3>
            <ul aria-label="Mes plans de repas">
              {plans.map((p) => {
                const types = planTypes(parsed.get(p.id)!)
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 border-b border-border last:border-b-0"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {p.name}
                      {types.length > 0 && (
                        <span className="text-xs text-muted"> · semaines {types.join(', ')}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      aria-label={`Supprimer le plan « ${p.name} »`}
                      className="min-h-11 min-w-11 rounded-full text-muted transition-colors hover:text-danger md:min-h-9 md:min-w-9"
                    >
                      ×
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-muted">
            Ajoutez un plan : un fichier Markdown avec vos aliments et leurs macros, vos recettes,
            et les repas jour par jour (« Lundi : … »), éventuellement en semaines A, B…
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
        </div>

        {file && (
          <PlanPreview
            key={file.name + file.content.length}
            file={file}
            onAdd={(name) => void add(name)}
            onCancel={() => setFile(null)}
            saving={saving}
            onError={onError}
          />
        )}
      </div>
    </details>
  )
}
