import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { formatDayMonth, formatLongDay, formatWeekdayShort } from '@/lib/dates'
import type { HabitDay, MoodPoint } from './dashboardLogic'
import { heatLevel } from './dashboardLogic'

/*
 * Graphiques du dashboard, en SVG sans dépendance. Règles (dataviz) : marques fines, extrémités
 * arrondies côté donnée, carrées sur la ligne de base ; grille en filet ; texte en couleurs de texte,
 * jamais en couleur de série ; info-bulle au survol ET au clavier ; chaque graphique a sa vue tableau.
 */

type Tip = { x: number; y: number; value: string; label: string } | null

/** Info-bulle : la valeur d'abord, le libellé ensuite. Positionnée en % du graphique. */
function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null
  return (
    <div
      role="status"
      className="dropdown pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl px-2.5 py-1.5 text-xs whitespace-nowrap"
      style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
    >
      <span className="block font-semibold">{tip.value}</span>
      <span className="block text-muted">{tip.label}</span>
    </div>
  )
}

/** Vue tableau repliée : les mêmes valeurs, sans graphique (lecteurs d'écran, lecture précise). */
export function TableView({
  caption,
  head,
  rows,
}: {
  caption: string
  head: string[]
  rows: (string | number)[][]
}) {
  return (
    <details className="mt-2 text-xs">
      <summary className="min-h-11 cursor-pointer py-2 text-muted hover:text-text md:min-h-8">
        Voir les données
      </summary>
      <table className="w-full text-left tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="py-1 pr-2 font-semibold text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

/** Chiffre clé : libellé, valeur, écart signé (couleur selon que la hausse est bonne ou non). */
export function StatTile({
  label,
  value,
  delta,
  children,
}: {
  label: string
  value: string
  delta?: { text: string; good: boolean | null } | null
  children?: ReactNode
}) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {delta && (
        <span
          className={`text-xs ${delta.good === null ? 'text-muted' : delta.good ? 'text-success' : 'text-danger'}`}
        >
          {delta.text}
        </span>
      )}
      {children}
    </div>
  )
}

/** Colonne arrondie en haut (4 px), carrée sur la ligne de base. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

/**
 * Une valeur par jour de la semaine. Mise en avant : le jour courant dans la couleur de série,
 * les autres en gris de retrait ; valeur écrite seulement sur le jour courant et le maximum.
 */
export function WeekColumns({
  days,
  today,
  unit,
}: {
  days: { day: string; value: number }[]
  today: string
  unit: (n: number) => string
}) {
  const [tip, setTip] = useState<Tip>(null)
  const W = 280
  const H = 128
  const top = 18
  const base = 100
  const band = W / days.length
  const colW = Math.min(24, band * 0.55)
  const max = Math.max(1, ...days.map((d) => d.value))
  const maxDay = days.reduce((a, b) => (b.value > a.value ? b : a), days[0]!)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="group"
        aria-label={`Par jour : ${days.map((d) => `${formatWeekdayShort(d.day)} ${unit(d.value)}`).join(', ')}`}
      >
        <line x1="0" x2={W} y1={base} y2={base} stroke="var(--viz-grid)" strokeWidth="1" />
        {days.map((d, i) => {
          const h = (d.value / max) * (base - top)
          const x = i * band + (band - colW) / 2
          const isToday = d.day === today
          const showValue = d.value > 0 && (isToday || d === maxDay)
          const show = () =>
            setTip({
              x: ((i + 0.5) * band * 100) / W,
              y: ((base - h - 4) * 100) / H,
              value: unit(d.value),
              label: formatLongDay(d.day),
            })
          return (
            <g key={d.day}>
              {h > 0 && (
                <path
                  d={columnPath(x, base - h, colW, h)}
                  fill={isToday ? 'var(--viz-1)' : 'var(--viz-quiet)'}
                />
              )}
              {showValue && (
                <text
                  x={x + colW / 2}
                  y={base - h - 5}
                  textAnchor="middle"
                  className="fill-current text-[10px] font-semibold"
                >
                  {d.value}
                </text>
              )}
              <text
                x={x + colW / 2}
                y={base + 16}
                textAnchor="middle"
                className={`text-[10px] ${isToday ? 'fill-current font-semibold' : 'fill-[var(--muted)]'}`}
              >
                {formatWeekdayShort(d.day).slice(0, 3)}
              </text>
              {/* zone de survol : toute la colonne, plus large que la marque */}
              <rect
                x={i * band}
                y={0}
                width={band}
                height={base}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${formatLongDay(d.day)} : ${unit(d.value)}`}
                onPointerEnter={show}
                onPointerLeave={() => setTip(null)}
                onFocus={show}
                onBlur={() => setTip(null)}
                className="outline-none focus-visible:stroke-[var(--accent)] focus-visible:stroke-2"
              />
            </g>
          )
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}

const HEAT_FILL = [
  'var(--surface)',
  'var(--heat-1)',
  'var(--heat-2)',
  'var(--heat-3)',
  'var(--heat-4)',
]

/** Carte de chaleur : une colonne par semaine, une case par jour, plus foncé = plus d'habitudes faites. */
export function HabitHeatmap({ weeks }: { weeks: HabitDay[][] }) {
  const [tip, setTip] = useState<Tip>(null)
  const cell = 14
  const gap = 3
  const left = 14
  const W = left + weeks.length * (cell + gap)
  const H = 7 * (cell + gap)
  const initials = ['L', '', 'M', '', 'V', '', 'D']

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" aria-hidden>
          {initials.map((t, d) =>
            t ? (
              <text
                key={d}
                x={0}
                y={d * (cell + gap) + cell - 3}
                className="fill-[var(--muted)] text-[9px]"
              >
                {t}
              </text>
            ) : null,
          )}
          {weeks.map((week, w) =>
            week.map((c, d) =>
              c.future ? null : (
                <rect
                  key={c.day}
                  x={left + w * (cell + gap)}
                  y={d * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx={3}
                  fill={HEAT_FILL[heatLevel(c)]}
                  onPointerEnter={() =>
                    setTip({
                      x: ((left + w * (cell + gap) + cell / 2) * 100) / W,
                      y: ((d * (cell + gap) - 2) * 100) / H,
                      value: c.total ? `${c.done}/${c.total}` : 'rien de prévu',
                      label: formatLongDay(c.day),
                    })
                  }
                  onPointerLeave={() => setTip(null)}
                />
              ),
            ),
          )}
        </svg>
        <Tooltip tip={tip} />
      </div>
      <div aria-hidden className="mt-2 flex items-center gap-1 text-[11px] text-muted">
        Moins
        {HEAT_FILL.map((f) => (
          <span key={f} className="size-3 rounded-[3px]" style={{ background: f }} />
        ))}
        Plus
      </div>
    </div>
  )
}

const SERIES = [
  { key: 'mood', name: 'Humeur', color: 'var(--viz-1)' },
  { key: 'energy', name: 'Énergie', color: 'var(--viz-2)' },
] as const

/**
 * Humeur et énergie (échelle 1 à 5, un seul axe) : deux courbes de 2 px, légende et étiquettes
 * directes en bout de courbe ; réticule qui se cale sur le jour le plus proche (souris ou flèches).
 */
export function MoodChart({ points }: { points: MoodPoint[] }) {
  const id = useId()
  const [index, setIndex] = useState<number | null>(null)
  const W = 320
  const H = 150
  const left = 18
  const right = 64
  const top = 10
  const bottom = 128
  const x = (i: number) => left + (i * (W - left - right)) / Math.max(1, points.length - 1)
  const y = (v: number) => bottom - ((v - 1) / 4) * (bottom - top)

  // Une courbe par série, interrompue là où rien n'a été noté
  const paths = SERIES.map((s) => {
    let d = ''
    let pen = false
    points.forEach((p, i) => {
      const v = p[s.key]
      if (v === null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
      pen = true
    })
    let lastIndex = -1
    points.forEach((p, i) => {
      if (p[s.key] !== null) lastIndex = i
    })
    return { ...s, d, lastIndex }
  })

  const pick = (i: number) => setIndex(Math.max(0, Math.min(points.length - 1, i)))
  function onKeyDown(e: KeyboardEvent<SVGRectElement>) {
    if (e.key === 'ArrowLeft') pick((index ?? points.length) - 1)
    else if (e.key === 'ArrowRight') pick((index ?? -1) + 1)
    else return
    e.preventDefault()
  }
  const p = index === null ? null : points[index]

  return (
    <div>
      <div aria-hidden className="mb-2 flex gap-4 text-xs text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-labelledby={`${id}-desc`}>
          <desc id={`${id}-desc`}>
            Humeur et énergie des 30 derniers jours, de 1 à 5. Flèches gauche et droite pour lire
            chaque jour.
          </desc>
          {[1, 3, 5].map((v) => (
            <g key={v}>
              <line
                x1={left}
                x2={W - right}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--viz-grid)"
                strokeWidth="1"
              />
              <text x={0} y={y(v) + 3} className="fill-[var(--muted)] text-[9px] tabular-nums">
                {v}
              </text>
            </g>
          ))}
          <text x={left} y={H - 4} className="fill-[var(--muted)] text-[9px]">
            {formatDayMonth(points[0]!.day)}
          </text>
          <text x={W - right} y={H - 4} textAnchor="end" className="fill-[var(--muted)] text-[9px]">
            {formatDayMonth(points.at(-1)!.day)}
          </text>
          {paths.map((s) => (
            <path
              key={s.key}
              d={s.d}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {/* point final cerclé du fond, puis étiquette directe en couleur de texte */}
          {paths.map((s, k) => {
            if (s.lastIndex < 0) return null
            const v = points[s.lastIndex]![s.key]!
            const ly =
              y(v) + (paths.length > 1 && k === 1 && points[s.lastIndex]!.mood === v ? 12 : 3)
            return (
              <g key={s.key}>
                <circle
                  cx={x(s.lastIndex)}
                  cy={y(v)}
                  r={4}
                  fill={s.color}
                  stroke="var(--canvas)"
                  strokeWidth="2"
                />
                <text x={x(s.lastIndex) + 8} y={ly} className="fill-current text-[10px]">
                  {s.name} {v}
                </text>
              </g>
            )
          })}
          {index !== null && (
            <line
              x1={x(index)}
              x2={x(index)}
              y1={top}
              y2={bottom}
              stroke="var(--muted)"
              strokeWidth="1"
            />
          )}
          <rect
            x={left}
            y={0}
            width={W - left - right}
            height={bottom}
            fill="transparent"
            tabIndex={0}
            role="slider"
            aria-label="Jour lu (flèches gauche et droite)"
            aria-valuemin={0}
            aria-valuemax={points.length - 1}
            aria-valuenow={index ?? points.length - 1}
            aria-valuetext={(() => {
              const q = points[index ?? points.length - 1]!
              return `${formatLongDay(q.day)} : humeur ${q.mood ?? 'non notée'}, énergie ${q.energy ?? 'non notée'}`
            })()}
            onPointerMove={(e) => {
              const box = e.currentTarget.getBoundingClientRect()
              pick(Math.round(((e.clientX - box.left) / box.width) * (points.length - 1)))
            }}
            onPointerLeave={() => setIndex(null)}
            onFocus={() => pick(points.length - 1)}
            onBlur={() => setIndex(null)}
            onKeyDown={onKeyDown}
            className="outline-none focus-visible:stroke-[var(--accent)] focus-visible:stroke-1"
          />
        </svg>
        <Tooltip
          tip={
            p && index !== null
              ? {
                  x: (x(index) * 100) / W,
                  y: (top * 100) / H,
                  value: `Humeur ${p.mood ?? '—'} · Énergie ${p.energy ?? '—'}`,
                  label: formatLongDay(p.day),
                }
              : null
          }
        />
      </div>
    </div>
  )
}

/** Barres classées (une teinte), valeur au bout ; repère du budget ; dépassement signalé en texte. */
export function RankedBars({
  items,
  format,
}: {
  items: { label: string; value: number; limit: number | null }[]
  format: (n: number) => string
}) {
  const max = Math.max(1, ...items.map((i) => Math.max(i.value, i.limit ?? 0)))
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => {
        const over = i.limit !== null && i.value > i.limit
        return (
          <li key={i.label} className="text-sm">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate">{i.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{format(i.value)}</span>
                {i.limit !== null && (
                  <span className="text-xs text-muted"> / {format(i.limit)}</span>
                )}
                {over && <span className="ml-1 text-xs font-semibold text-danger">dépassé</span>}
              </span>
            </div>
            <div className="relative h-2.5 rounded-r-[4px] bg-surface">
              <div
                className={`h-full rounded-r-[4px] ${over ? 'bg-danger' : 'bg-[var(--viz-1)]'}`}
                style={{ width: `${(Math.min(i.value, max) / max) * 100}%` }}
              />
              {i.limit !== null && (
                <span
                  aria-hidden
                  className="absolute -top-0.5 h-3.5 w-px bg-text"
                  style={{ left: `${(i.limit / max) * 100}%` }}
                />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
