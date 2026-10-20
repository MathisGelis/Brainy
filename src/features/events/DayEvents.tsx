import { useState, type FormEvent } from 'react'
import { Select, useToast, type SelectOption } from '@/components/ui'
import { addDays, daysBetween, formatDayMonth, formatLongDay, todayISO } from '@/lib/dates'
import { isoWeekday, WEEKDAYS } from '@/lib/naturalDate'
import { describeRepeat, extraDays, occurrencesOn, occurrenceWhen, weeklyDays } from './eventLogic'
import { parseEventInput } from './parseEventInput'
import type { CalendarEvent, EventPatch, Occurrence, Repeat } from './types'
import { useEvents } from './useEvents'

const h3 = 'mb-1 text-xs font-semibold text-muted uppercase'
const field = 'field min-h-11 px-3 md:min-h-9'
const small =
  'min-h-11 rounded-full px-3 text-xs text-muted transition-colors hover:bg-bg hover:text-text md:min-h-9'
const INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const REPEATS: SelectOption<Repeat | 'none'>[] = [
  { value: 'none', label: 'Ne se répète pas' },
  { value: 'daily', label: 'Tous les jours' },
  { value: 'weekly', label: 'Toutes les semaines' },
  { value: 'monthly', label: 'Tous les mois' },
  { value: 'yearly', label: 'Tous les ans' },
]
const UNIT: Record<Repeat, string> = {
  daily: 'jour(s)',
  weekly: 'semaine(s)',
  monthly: 'mois',
  yearly: 'an(s)',
}

/** « le 12 nov. », « du 12 nov. au 14 nov. », suivi de la récurrence s'il y en a une. */
export function describeWhen(
  e: Pick<CalendarEvent, 'start_on' | 'end_on'> & Partial<CalendarEvent>,
) {
  const dates =
    e.start_on === e.end_on
      ? `le ${formatDayMonth(e.start_on)}`
      : `du ${formatDayMonth(e.start_on)} au ${formatDayMonth(e.end_on)}`
  const repeat = e.repeat ? describeRepeat(e as CalendarEvent) : null
  return repeat ? `${dates}, ${repeat.charAt(0).toLowerCase()}${repeat.slice(1)}` : dates
}

/** Tous les champs d'un événement ; chaque changement est enregistré aussitôt. */
function EventEditor({
  occurrence,
  onUpdate,
  onDeleteSeries,
  onDeleteOne,
  onClose,
}: {
  occurrence: Occurrence
  onUpdate: (patch: EventPatch) => void
  onDeleteSeries: () => void
  onDeleteOne: () => void
  onClose: () => void
}) {
  const e = occurrence.event
  const span = extraDays(e)
  const time = (t: string | null) => t?.slice(0, 5) ?? ''

  function setStart(start: string) {
    if (!start) return
    onUpdate({
      start_on: start,
      end_on: addDays(start, span),
      ...(e.repeat_until && e.repeat_until < start ? { repeat_until: null } : {}),
    })
  }

  function setRepeat(value: Repeat | 'none') {
    if (value === 'none')
      onUpdate({
        repeat: null,
        repeat_every: 1,
        repeat_days: null,
        repeat_until: null,
        skipped: [],
      })
    else
      onUpdate({
        repeat: value,
        repeat_days: value === 'weekly' ? [isoWeekday(e.start_on)] : null,
      })
  }

  function toggleDay(day: number) {
    const days = weeklyDays(e)
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()
    if (next.length > 0) onUpdate({ repeat_days: next })
  }

  return (
    <div className="mb-2 flex flex-col gap-3 rounded-2xl bg-surface p-3 text-sm">
      <input
        enterKeyHint="done"
        defaultValue={e.title}
        aria-label="Titre de l’événement"
        maxLength={120}
        onBlur={(ev) => {
          const title = ev.target.value.trim()
          if (title && title !== e.title) onUpdate({ title })
          else ev.target.value = e.title
        }}
        className={`${field} w-full font-semibold`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-muted">
          Du
          <input
            type="date"
            value={e.start_on}
            onChange={(ev) => setStart(ev.target.value)}
            className={`${field} text-text`}
          />
        </label>
        <label className="flex items-center gap-2 text-muted">
          au
          <input
            type="date"
            value={e.end_on}
            min={e.start_on}
            onChange={(ev) => {
              const end = ev.target.value
              if (end && end >= e.start_on && daysBetween(e.start_on, end) <= 366)
                onUpdate({ end_on: end, ...(end > e.start_on ? {} : { end_time: null }) })
            }}
            className={`${field} text-text`}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-muted">
          De
          <input
            type="time"
            value={time(e.start_time)}
            onChange={(ev) =>
              onUpdate(
                ev.target.value
                  ? { start_time: ev.target.value }
                  : { start_time: null, end_time: null },
              )
            }
            className={`${field} text-text`}
          />
        </label>
        <label className="flex items-center gap-2 text-muted">
          à
          <input
            type="time"
            value={time(e.end_time)}
            disabled={!e.start_time}
            onChange={(ev) => {
              const end = ev.target.value || null
              const sameDay = e.start_on === e.end_on
              if (!end || !sameDay || end >= time(e.start_time)) onUpdate({ end_time: end })
            }}
            className={`${field} text-text disabled:opacity-50`}
          />
        </label>
        {!e.start_time && <span className="text-xs text-muted">Toute la journée</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          label="Répétition"
          value={e.repeat ?? 'none'}
          onChange={setRepeat}
          options={REPEATS}
          className={field}
        />
        {e.repeat && (
          <>
            <label className="flex items-center gap-2 text-muted">
              tous les
              <input
                key={`every-${e.repeat_every}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                defaultValue={e.repeat_every}
                aria-label="Intervalle de répétition"
                onBlur={(ev) => {
                  const n = Math.round(Number(ev.target.value))
                  if (n >= 1 && n <= 99 && n !== e.repeat_every) onUpdate({ repeat_every: n })
                  else ev.target.value = String(e.repeat_every)
                }}
                className={`${field} w-16 text-text`}
              />
              {UNIT[e.repeat]}
            </label>
            <label className="flex items-center gap-2 text-muted">
              jusqu’au
              <input
                type="date"
                value={e.repeat_until ?? ''}
                min={e.start_on}
                aria-label="Fin de la répétition (facultatif)"
                onChange={(ev) => onUpdate({ repeat_until: ev.target.value || null })}
                className={`${field} text-text`}
              />
            </label>
          </>
        )}
      </div>
      {e.repeat === 'weekly' && (
        <div role="group" aria-label="Jours de répétition" className="flex gap-1">
          {INITIALS.map((initial, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={weeklyDays(e).includes(i + 1)}
              aria-label={WEEKDAYS[i]}
              onClick={() => toggleDay(i + 1)}
              className="pill size-9 border border-[var(--field-border)] text-xs"
            >
              {initial}
            </button>
          ))}
        </div>
      )}

      <textarea
        defaultValue={e.note ?? ''}
        aria-label="Note de l’événement"
        placeholder="Note (adresse, train, à prévoir…)"
        rows={2}
        maxLength={2000}
        onBlur={(ev) => {
          const note = ev.target.value.trim() || null
          if (note !== e.note) onUpdate({ note })
        }}
        className="field w-full px-3 py-2"
      />
      {e.repeat && (
        <p className="text-xs text-muted">Les modifications s’appliquent à toute la série.</p>
      )}

      <div className="flex flex-wrap justify-end gap-1">
        {e.repeat ? (
          <>
            <button type="button" onClick={onDeleteOne} className={`${small} hover:text-danger`}>
              Supprimer ce jour-là
            </button>
            <button type="button" onClick={onDeleteSeries} className={`${small} hover:text-danger`}>
              Supprimer la série
            </button>
          </>
        ) : (
          <button type="button" onClick={onDeleteSeries} className={`${small} hover:text-danger`}>
            Supprimer
          </button>
        )}
        <button type="button" onClick={onClose} className={`${small} font-semibold text-accent`}>
          OK
        </button>
      </div>
    </div>
  )
}

/** Événements d'un jour du calendrier : liste, ajout en une phrase, modification. */
export function DayEvents({ day, onError }: { day: string; onError: (m: string) => void }) {
  const toast = useToast()
  const { events, addEvent, updateEvent, removeEvent, skipOccurrence } = useEvents({ onError })
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const label = formatLongDay(day)
  const items = occurrencesOn(events, day)

  function add(ev: FormEvent) {
    ev.preventDefault()
    const parsed = parseEventInput(text, day, todayISO())
    if (!parsed.title) return
    const event = addEvent(parsed)
    setText('')
    toast.show(`« ${event.title} » ${describeWhen(event)}`, () => removeEvent(event))
  }

  return (
    <section aria-label={`Événements du ${label}`}>
      <h3 className={h3}>Événements</h3>
      {items.length > 0 && (
        <ul className="mb-2">
          {items.map((o) => {
            const open = editing === o.event.id
            const repeat = describeRepeat(o.event)
            return (
              <li key={`${o.event.id}-${o.start}`}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={`Modifier « ${o.event.title} »`}
                  onClick={() => setEditing(open ? null : o.event.id)}
                  className="flex min-h-11 w-full items-center gap-2 border-b border-border text-left"
                >
                  <span aria-hidden className="h-8 w-1 shrink-0 rounded-full bg-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{o.event.title}</span>
                    <span className="block text-xs text-muted">
                      {occurrenceWhen(o, day)}
                      {repeat && ` · ↻ ${repeat}`}
                    </span>
                  </span>
                </button>
                {open && (
                  <EventEditor
                    occurrence={o}
                    onUpdate={(patch) => updateEvent(o.event.id, patch)}
                    onClose={() => setEditing(null)}
                    onDeleteSeries={() => {
                      setEditing(null)
                      toast.show(
                        o.event.repeat ? 'Série supprimée' : 'Événement supprimé',
                        removeEvent(o.event),
                      )
                    }}
                    onDeleteOne={() => {
                      setEditing(null)
                      toast.show(
                        `Supprimé le ${formatDayMonth(o.start)}`,
                        skipOccurrence(o.event, o.start),
                      )
                    }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
      <form onSubmit={add}>
        <input
          enterKeyHint="send"
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          aria-label={`Nouvel événement pour le ${label}`}
          aria-describedby="event-hint"
          placeholder={items.length === 0 ? 'Ajouter un événement…' : 'Ajouter un autre événement…'}
          className="field min-h-11 w-full px-4 md:min-h-10"
        />
        <p id="event-hint" className="mt-1 px-1 text-xs text-muted">
          Ex. « Lyon du 12 au 14 nov », « Dentiste 14h30 », « Anniv de Léa tous les ans »
        </p>
      </form>
    </section>
  )
}
