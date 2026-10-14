/** Humeur et énergie d'un jour, de 1 à 5 ; chaque valeur est facultative. */
export type DayCheckin = {
  day: string
  mood: number | null
  energy: number | null
}

export type CheckinField = 'mood' | 'energy'
