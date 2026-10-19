const EVENING_KEY = 'brainy.ritual.evening'

/** Jour du dernier rituel du soir terminé ou écarté sur cet appareil. */
export function eveningRitualDoneOn(): string | null {
  try {
    return localStorage.getItem(EVENING_KEY)
  } catch {
    return null
  }
}

export function markEveningRitualDone(day: string) {
  try {
    localStorage.setItem(EVENING_KEY, day)
  } catch {
    /* stockage indisponible : la carte reviendra, sans gravité */
  }
}

const WEEK_KEY = 'brainy.ritual.week'

/** Lundi de la dernière semaine planifiée sur cet appareil. */
export function weekPlannedFor(): string | null {
  try {
    return localStorage.getItem(WEEK_KEY)
  } catch {
    return null
  }
}

export function markWeekPlanned(monday: string) {
  try {
    localStorage.setItem(WEEK_KEY, monday)
  } catch {
    /* stockage indisponible : la carte reviendra, sans gravité */
  }
}
