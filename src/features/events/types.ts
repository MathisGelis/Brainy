export type Repeat = 'daily' | 'weekly' | 'monthly' | 'yearly'

/** Événement du calendrier (table `events`). Les heures arrivent en « HH:MM:SS » de la base. */
export type CalendarEvent = {
  id: string
  title: string
  start_on: string
  end_on: string
  start_time: string | null
  end_time: string | null
  note: string | null
  repeat: Repeat | null
  repeat_every: number
  /** Jours ISO (1 = lundi) d'une récurrence hebdomadaire ; null = le jour de `start_on` */
  repeat_days: number[] | null
  repeat_until: string | null
  /** Premier jour des occurrences supprimées une à une */
  skipped: string[]
  created_at: string
}

export type EventPatch = Partial<Omit<CalendarEvent, 'id' | 'created_at'>>

/** Une occurrence : l'événement et les jours qu'elle couvre. */
export type Occurrence = { event: CalendarEvent; start: string; end: string }
