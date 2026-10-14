const EVENING_KEY = 'cockpit.ritual.evening'

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
