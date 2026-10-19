import { useSyncExternalStore } from 'react'

/** Nouvelle version prête (service worker en attente) : la fonction qui l'active et recharge. */
let applyUpdate: (() => void) | null = null
const listeners = new Set<() => void>()

export function setUpdateReady(apply: (() => void) | null) {
  applyUpdate = apply
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useUpdateReady(): (() => void) | null {
  return useSyncExternalStore(subscribe, () => applyUpdate)
}
