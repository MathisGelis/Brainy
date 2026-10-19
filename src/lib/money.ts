const MAX_CENTS = 2_000_000_000 // limite d'un `integer` Postgres, avec marge

/**
 * Convertit une saisie utilisateur ("12", "12,5", "1 234.56 €") en centimes entiers,
 * sans passer par un flottant. Renvoie `null` si la saisie est invalide ou nulle.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[\s\u00a0\u202f€]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole = '0', decimals = ''] = cleaned.split('.')
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'))
  return cents > 0 && cents <= MAX_CENTS ? cents : null
}

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** Affichage : 1250 → « 12,50 € ». */
export function formatCents(cents: number): string {
  return euro.format(cents / 100)
}

/** Valeur éditable : 1250 → « 12,50 ». */
export function centsToInput(cents: number): string {
  const whole = Math.trunc(cents / 100)
  const rest = String(cents % 100).padStart(2, '0')
  return `${whole},${rest}`
}
