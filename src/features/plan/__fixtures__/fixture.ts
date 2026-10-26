import data from './plan-fictif.xlsx?inline'

/** Classeur fictif des tests (généré par scripts/plan-fixture.py), en ArrayBuffer. */
export function planFixture(): ArrayBuffer {
  const binary = atob(data.slice(data.indexOf(',') + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
