import { Link } from 'react-router-dom'
import { addDays } from '@/lib/dates'
import { occurrencesOn, occurrenceWhen } from './eventLogic'
import { useEvents } from './useEvents'

/** Accueil : les événements d'aujourd'hui et de demain (rien si l'agenda est vide). */
export function TodayEvents({ today, onError }: { today: string; onError: (m: string) => void }) {
  const { events } = useEvents({ onError })
  const tomorrow = addDays(today, 1)
  const days = [
    { day: today, label: "Aujourd'hui", items: occurrencesOn(events, today) },
    { day: tomorrow, label: 'Demain', items: occurrencesOn(events, tomorrow) },
  ].filter((d) => d.items.length > 0)
  if (days.length === 0) return null

  return (
    <section aria-labelledby="today-events" className="card mb-4 flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <h2 id="today-events" className="text-xs font-semibold text-muted uppercase">
          Agenda
        </h2>
        <Link to="/calendrier" className="text-xs text-accent">
          Calendrier →
        </Link>
      </div>
      {days.map(({ day, label, items }) => (
        <div key={day}>
          {days.length > 1 || day !== today ? (
            <h3 className="text-xs text-muted">{label}</h3>
          ) : null}
          <ul>
            {items.map((o) => (
              <li key={`${o.event.id}-${o.start}`} className="flex items-center gap-2 py-1">
                <span aria-hidden className="h-6 w-1 shrink-0 rounded-full bg-accent" />
                <span className="min-w-0 flex-1 truncate font-semibold">{o.event.title}</span>
                <span className="shrink-0 text-xs text-muted">
                  {occurrenceWhen(o, day).split(' · ')[0]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
