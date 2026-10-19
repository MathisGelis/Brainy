/** Humeur et énergie d'un jour (de 1 à 5) et victoire du jour ; chaque valeur est facultative. */
export type DayCheckin = {
  day: string
  mood: number | null
  energy: number | null
  /** Une ligne notée le soir (280 caractères max) */
  win: string | null
}

export type CheckinField = 'mood' | 'energy'
