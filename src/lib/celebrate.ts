/** Événement écouté par le fond animé : une petite onde quand on accomplit quelque chose. */
export const CELEBRATE_EVENT = 'cockpit:celebrate'

export function celebrate(strength = 1) {
  window.dispatchEvent(new CustomEvent<number>(CELEBRATE_EVENT, { detail: strength }))
}
