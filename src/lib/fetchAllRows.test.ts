import { fetchAllRows, PAGE_SIZE } from './fetchAllRows'

function fakeTable(count: number) {
  const rows = Array.from({ length: count }, (_, i) => ({ i }))
  const calls: [number, number][] = []
  const page = async (from: number, to: number) => {
    calls.push([from, to])
    return { data: rows.slice(from, to + 1), error: null }
  }
  return { page, calls }
}

describe('fetchAllRows', () => {
  it('lit une seule page quand il y a peu de lignes', async () => {
    const { page, calls } = fakeTable(3)
    expect(await fetchAllRows(page)).toHaveLength(3)
    expect(calls).toEqual([[0, PAGE_SIZE - 1]])
  })

  it('enchaîne les pages au-delà de la limite de 1000 lignes', async () => {
    const { page, calls } = fakeTable(2 * PAGE_SIZE + 5)
    const rows = await fetchAllRows<{ i: number }>(page)
    expect(rows).toHaveLength(2 * PAGE_SIZE + 5)
    expect(rows.at(-1)).toEqual({ i: 2 * PAGE_SIZE + 4 })
    expect(calls).toHaveLength(3)
  })

  it('fait une page de plus quand le total est un multiple exact', async () => {
    const { page, calls } = fakeTable(PAGE_SIZE)
    expect(await fetchAllRows(page)).toHaveLength(PAGE_SIZE)
    expect(calls).toHaveLength(2)
  })

  it('propage les erreurs', async () => {
    const boom = new Error('réseau')
    await expect(fetchAllRows(async () => ({ data: null, error: boom }))).rejects.toBe(boom)
  })
})
