import type { Page, Route } from '@playwright/test'

/**
 * Faux Supabase pour les tests e2e : session pré-remplie et petite API PostgREST en mémoire
 * (filtres eq/gte/lt, tri, pagination, insert/update/delete). L'app tourne pour de vrai dans
 * le navigateur ; seules les requêtes réseau vers Supabase sont interceptées.
 */
export const SUPABASE_URL = 'http://localhost:54321'
export const STORAGE_KEY = 'sb-localhost-auth-token'
const USER_ID = '00000000-0000-4000-8000-000000000001'

export type Row = Record<string, unknown>
export type FakeDb = Record<string, Row[]>

const RESERVED = new Set(['select', 'order', 'offset', 'limit', 'columns', 'on_conflict'])

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1 // nulls en dernier
  if (b === null || b === undefined) return -1
  return String(a) < String(b) ? -1 : 1
}

function matches(row: Row, params: URLSearchParams): boolean {
  for (const [column, expr] of params) {
    if (RESERVED.has(column)) continue
    const [op, ...rest] = expr.split('.')
    const expected = rest.join('.')
    const actual = row[column] === null || row[column] === undefined ? 'null' : String(row[column])
    if (op === 'in') {
      const values = expected
        .replace(/^\(|\)$/g, '')
        .split(',')
        .map((v) => v.replace(/^"|"$/g, ''))
      if (!values.includes(actual)) return false
      continue
    }
    const ok =
      op === 'eq'
        ? actual === expected
        : op === 'neq'
          ? actual !== expected
          : op === 'gte'
            ? actual >= expected
            : op === 'gt'
              ? actual > expected
              : op === 'lte'
                ? actual <= expected
                : op === 'lt'
                  ? actual < expected
                  : op === 'is'
                    ? actual === expected
                    : true
    if (!ok) return false
  }
  return true
}

function sortRows(rows: Row[], order: string | null): Row[] {
  if (!order) return rows
  const keys = order.split(',').map((part) => {
    const [column, direction] = part.split('.')
    return { column: column!, desc: direction === 'desc' }
  })
  return [...rows].sort((a, b) => {
    for (const { column, desc } of keys) {
      const c = compare(a[column], b[column])
      if (c !== 0) return desc ? -c : c
    }
    return 0
  })
}

async function handleRest(route: Route, db: FakeDb) {
  const request = route.request()
  const url = new URL(request.url())
  const table = url.pathname.replace('/rest/v1/', '')
  const params = url.searchParams
  db[table] ??= []
  const rows = db[table]

  switch (request.method()) {
    case 'GET': {
      const offset = Number(params.get('offset') ?? 0)
      const limit = params.has('limit') ? Number(params.get('limit')) : Infinity
      const result = sortRows(
        rows.filter((r) => matches(r, params)),
        params.get('order'),
      )
      return route.fulfill({ json: result.slice(offset, offset + limit) })
    }
    case 'POST': {
      const body = request.postDataJSON() as Row | Row[]
      const inserted = (Array.isArray(body) ? body : [body]).map((r): Row => ({
        user_id: USER_ID,
        ...r,
      }))
      // upsert : on_conflict=col1,col2 + Prefer resolution=ignore-duplicates / merge-duplicates
      const conflict = params.get('on_conflict')?.split(',')
      const prefer = request.headers()['prefer'] ?? ''
      for (const row of inserted) {
        const existing =
          conflict && rows.find((r) => conflict.every((c) => String(r[c]) === String(row[c])))
        if (!existing) rows.push(row)
        else if (prefer.includes('merge-duplicates')) Object.assign(existing, row)
      }
      return route.fulfill({ status: 201, body: '' })
    }
    case 'PATCH': {
      const patch = request.postDataJSON() as Row
      for (const r of rows) if (matches(r, params)) Object.assign(r, patch)
      return route.fulfill({ status: 204, body: '' })
    }
    case 'DELETE': {
      db[table] = rows.filter((r) => !matches(r, params))
      return route.fulfill({ status: 204, body: '' })
    }
    default:
      return route.fulfill({ status: 200, body: '' })
  }
}

export async function installFakeSupabase(page: Page, seed: FakeDb = {}): Promise<FakeDb> {
  const db: FakeDb = structuredClone(seed)
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600
  const session = {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 24 * 3600,
    expires_at: expiresAt,
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'mathis@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  }
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: STORAGE_KEY,
    value: JSON.stringify(session),
  })
  // Interception au niveau du contexte : elle couvre aussi les requêtes du service worker.
  const context = page.context()
  await context.route(`${SUPABASE_URL}/auth/v1/**`, (route) =>
    route.fulfill({ json: session.user }),
  )
  await context.route(`${SUPABASE_URL}/rest/v1/**`, (route) => handleRest(route, db))
  return db
}

/** Jour courant à Paris, comme dans l'app. */
export function parisToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
