import { Link } from 'react-router-dom'
import {
  BudgetIcon,
  GoalsIcon,
  HabitsIcon,
  ProgressBar,
  TodayIcon,
  TodoIcon,
  useToast,
} from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { TODAY_PATH } from '@/app/navItems'
import { useBudget } from '@/features/budget/useBudget'
import { useCheckins } from '@/features/checkins/useCheckins'
import { useHabits } from '@/features/habits/useHabits'
import { TodayMenuCard } from '@/features/menu/TodayMenuCard'
import { useSavings } from '@/features/savings/useSavings'
import { Section } from '@/features/today/parts'
import { filterTodos } from '@/features/todos/todoLogic'
import { useTodos } from '@/features/todos/useTodos'
import { formatDayMonth, formatLongDay, formatMonthLabel, monthOf, todayISO } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { HabitHeatmap, MoodChart, RankedBars, StatTile, TableView, WeekColumns } from './charts'
import { habitDay, habitGrid, habitRate, mean, moodSeries, todosLastDays } from './dashboardLogic'
import { GoalsWidget, MonthBudgetWidget } from './widgets'

const percent = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)} %`)
const score = (v: number) => v.toFixed(1).replace('.', ',')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`

/** Écart signé face à une période de référence ; null si rien à comparer. */
function delta(
  now: number | null,
  before: number | null,
  format: (n: number) => string,
  versus: string,
) {
  if (now === null || before === null) return null
  const d = now - before
  if (Math.abs(d) < 1e-9) return { text: `stable ${versus}`, good: null }
  return { text: `${d > 0 ? '+' : '−'}${format(Math.abs(d))} ${versus}`, good: d > 0 }
}

/** Accueil visuel : la semaine, les habitudes, le budget, l'humeur et les objectifs en un coup d'œil. */
export default function DashboardPage() {
  const toast = useToast()
  const onError = (m: string) => toast.show(m)
  const today = todayISO()
  const month = monthOf(today)

  const { todos } = useTodos({ onError })
  const { habits, entries } = useHabits({ onError })
  const { checkins } = useCheckins({ onError })
  const { summary } = useBudget(month, { onError })
  const { goals: savings, balance } = useSavings({ onError })

  // Todos : 7 derniers jours glissants (jamais vide un lundi) face aux 7 d'avant
  const week = todosLastDays(todos, today)
  const dueToday = filterTodos(todos, 'today', today).length

  // Habitudes : 12 semaines, et taux de la semaine face à la précédente (mêmes jours écoulés)
  const grid = habitGrid(habits, entries, today)
  const thisWeek = grid.at(-1)!
  const elapsed = thisWeek.filter((c) => !c.future).length
  const weekRate = habitRate(thisWeek)
  const lastWeekRate = habitRate(grid.at(-2)!.slice(0, elapsed))
  const todayHabits = habitDay(habits, entries, today, today)

  // Humeur : 30 jours ; moyenne des 7 derniers face aux 7 d'avant
  const mood = moodSeries(checkins, today, 30)
  const mood7 = mean(mood.slice(-7).map((p) => p.mood))
  const moodPrev7 = mean(mood.slice(-14, -7).map((p) => p.mood))
  const noted = mood.filter((p) => p.mood !== null || p.energy !== null)

  // Budget : catégories les plus dépensées
  const bars = summary.byCategory
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6)
    .map((c) => ({ label: c.category?.name ?? 'Sans catégorie', value: c.spent, limit: c.budget }))

  const activeSavings = savings.filter((s) => !s.archived).slice(0, 4)
  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date())

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="-mt-4 mb-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted first-letter:uppercase">{dateLabel}</p>
        <Link
          to={TODAY_PATH}
          className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--field-border)] bg-bg px-4 text-sm transition-colors hover:bg-surface md:min-h-9"
        >
          <TodayIcon width={18} height={18} />
          Ma journée
          <span className="text-xs text-muted">
            {plural(dueToday, 'todo')}
            {todayHabits.total > 0 && ` · ${todayHabits.done}/${todayHabits.total} habitudes`}
          </span>
        </Link>
      </div>

      <section aria-label="Chiffres clés" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Todos faites, 7 jours"
          value={String(week.total)}
          delta={
            week.total + week.previous === 0
              ? null
              : delta(week.total, week.previous, String, 'vs 7 j d’avant')
          }
        />
        <StatTile
          label="Habitudes cette semaine"
          value={percent(weekRate)}
          delta={delta(
            weekRate,
            lastWeekRate,
            (d) => `${Math.round(d * 100)} pts`,
            'vs sem. dernière',
          )}
        />
        <StatTile
          label={
            summary.remaining === null
              ? `Dépensé en ${formatMonthLabel(month)}`
              : 'Reste à dépenser'
          }
          value={formatCents(summary.remaining ?? summary.totalSpent)}
          delta={summary.over ? { text: 'Budget dépassé', good: false } : null}
        >
          {summary.totalBudget > 0 && (
            <div className="mt-1">
              <ProgressBar
                ratio={Math.min(1, summary.totalSpent / summary.totalBudget)}
                over={summary.over}
                label="Budget du mois consommé"
              />
            </div>
          )}
        </StatTile>
        <StatTile
          label="Humeur, 7 derniers jours"
          value={mood7 === null ? '—' : `${score(mood7)} / 5`}
          delta={delta(mood7, moodPrev7, score, 'vs 7 j d’avant')}
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Todos terminées, 7 jours" to="/todo" icon={TodoIcon} id="dash-week">
          <WeekColumns days={week.days} today={today} unit={(n) => plural(n, 'todo')} />
          <TableView
            caption="Todos terminées par jour, 7 derniers jours"
            head={['Jour', 'Todos terminées']}
            rows={week.days.map((d) => [formatLongDay(d.day), d.value])}
          />
        </Section>

        <Section title="Habitudes, 12 semaines" to="/habitudes" icon={HabitsIcon} id="dash-habits">
          {habits.some((h) => !h.archived) ? (
            <>
              <p className="text-xs text-muted">
                Chaque case est un jour : plus elle est foncée, plus d’habitudes faites.
              </p>
              <HabitHeatmap weeks={grid} />
              <TableView
                caption="Habitudes faites par semaine"
                head={['Semaine du', 'Faites']}
                rows={grid.map((w) => [formatDayMonth(w[0]!.day), percent(habitRate(w))])}
              />
            </>
          ) : (
            <p className="text-muted">
              Aucune habitude suivie.{' '}
              <Link to="/habitudes" className="text-accent">
                En créer une
              </Link>
            </p>
          )}
        </Section>

        <Section
          title={`Budget de ${formatMonthLabel(month)}`}
          to="/budget"
          icon={BudgetIcon}
          id="dash-budget"
        >
          <MonthBudgetWidget today={today} onError={onError} />
          {bars.length > 0 && (
            <>
              <h3 className="mt-2 text-xs font-semibold text-muted uppercase">Par catégorie</h3>
              <RankedBars items={bars} format={formatCents} />
              <TableView
                caption="Dépenses du mois par catégorie"
                head={['Catégorie', 'Dépensé', 'Budget']}
                rows={bars.map((b) => [
                  b.label,
                  formatCents(b.value),
                  b.limit === null ? '—' : formatCents(b.limit),
                ])}
              />
            </>
          )}
        </Section>

        <Section
          title="Humeur et énergie, 30 jours"
          to={TODAY_PATH}
          icon={TodayIcon}
          id="dash-mood"
        >
          {noted.length >= 2 ? (
            <>
              <MoodChart points={mood} />
              <TableView
                caption="Humeur et énergie notées ces 30 derniers jours"
                head={['Jour', 'Humeur', 'Énergie']}
                rows={noted.map((p) => [formatLongDay(p.day), p.mood ?? '—', p.energy ?? '—'])}
              />
            </>
          ) : (
            <p className="text-muted">
              Notez votre humeur quelques jours pour voir la courbe.{' '}
              <Link to={TODAY_PATH} className="text-accent">
                Noter aujourd’hui
              </Link>
            </p>
          )}
        </Section>

        <Section title="Prochains jalons" to="/objectifs" icon={GoalsIcon} id="dash-goals">
          <GoalsWidget onError={onError} />
        </Section>

        <div className="flex flex-col gap-4">
          {activeSavings.length > 0 && (
            <Section title="Épargne" to="/plan" icon={BudgetIcon} id="dash-savings">
              <ul className="flex flex-col gap-3 text-sm">
                {activeSavings.map((s) => {
                  const b = balance(s.id)
                  return (
                    <li key={s.id} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate">{s.name}</span>
                        <span>
                          <span className="font-semibold">{formatCents(b)}</span>
                          <span className="text-xs text-muted">
                            {' '}
                            / {formatCents(s.target_cents)}
                          </span>
                        </span>
                      </div>
                      <ProgressBar
                        ratio={Math.min(1, Math.max(0, b / s.target_cents))}
                        over={false}
                        label={`Cagnotte ${s.name}`}
                      />
                    </li>
                  )
                })}
              </ul>
            </Section>
          )}
          <TodayMenuCard today={today} onError={onError} />
        </div>
      </div>
    </>
  )
}
