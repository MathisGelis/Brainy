/**
 * Lecture minimale d'un classeur .xlsx dans le navigateur, sans dépendance : un .xlsx est un zip
 * de fichiers XML. On lit les valeurs des cellules (et le texte des formules), pas les styles.
 * Le zip est décompressé par `DecompressionStream`, le XML par `DOMParser`.
 */

export type CellValue = string | number | boolean | null
export type Cell = { value: CellValue; formula: string | null }

export class Sheet {
  constructor(
    readonly name: string,
    private readonly cells: Map<string, Cell>,
    readonly rowCount: number,
  ) {}

  /** Cellule par ligne et colonne, à partir de 1 (comme dans Excel). */
  cell(row: number, col: number): Cell | undefined {
    return this.cells.get(`${row}:${col}`)
  }

  value(row: number, col: number): CellValue {
    return this.cell(row, col)?.value ?? null
  }

  /** Texte d'une cellule, nettoyé (chaîne vide si vide). */
  text(row: number, col: number): string {
    const v = this.value(row, col)
    return v === null ? '' : String(v).trim()
  }

  number(row: number, col: number): number | null {
    const v = this.value(row, col)
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }
}

export class XlsxError extends Error {}

// --- zip ---

type Entry = { name: string; method: number; size: number; offset: number }

function zipEntries(bytes: Uint8Array): Entry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // Fin du répertoire central : signature cherchée depuis la fin (le commentaire fait ≤ 64 ko)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) throw new XlsxError('Ce fichier n’est pas un classeur Excel (.xlsx).')
  const count = view.getUint16(end + 10, true)
  let p = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const entries: Entry[] = []
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new XlsxError('Classeur endommagé.')
    const nameLength = view.getUint16(p + 28, true)
    entries.push({
      method: view.getUint16(p + 10, true),
      size: view.getUint32(p + 20, true),
      offset: view.getUint32(p + 42, true),
      name: decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength)),
    })
    p += 46 + nameLength + view.getUint16(p + 30, true) + view.getUint16(p + 32, true)
  }
  return entries
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(data.slice())
      controller.close()
    },
  })
  const stream = source.pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readEntry(bytes: Uint8Array, entry: Entry): Promise<string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const start =
    entry.offset +
    30 +
    view.getUint16(entry.offset + 26, true) +
    view.getUint16(entry.offset + 28, true)
  const raw = bytes.subarray(start, start + entry.size)
  if (entry.method === 0) return new TextDecoder().decode(raw)
  if (entry.method === 8) return new TextDecoder().decode(await inflate(raw))
  throw new XlsxError('Compression du classeur non prise en charge.')
}

// --- XML ---

const parseXml = (text: string) => new DOMParser().parseFromString(text, 'application/xml')

/** Descendants portant ce nom local, quel que soit leur espace de noms. */
const children = (el: Element | Document, name: string) =>
  Array.from(el.getElementsByTagNameNS('*', name))

/** « AB12 » → [12, 28] */
function position(ref: string): [number, number] {
  const m = /^([A-Z]+)(\d+)$/.exec(ref)
  if (!m) return [0, 0]
  let col = 0
  for (const ch of m[1]!) col = col * 26 + ch.charCodeAt(0) - 64
  return [Number(m[2]), col]
}

/** Toutes les feuilles du classeur, dans l'ordre des onglets. */
export async function readXlsx(data: ArrayBuffer): Promise<Sheet[]> {
  const bytes = new Uint8Array(data)
  const entries = new Map(zipEntries(bytes).map((e) => [e.name, e]))
  const read = async (name: string) => {
    const entry = entries.get(name)
    return entry ? readEntry(bytes, entry) : null
  }

  const workbook = await read('xl/workbook.xml')
  const rels = await read('xl/_rels/workbook.xml.rels')
  if (!workbook || !rels) throw new XlsxError('Ce fichier n’est pas un classeur Excel (.xlsx).')

  const targets = new Map(
    children(parseXml(rels), 'Relationship').map((r) => [
      r.getAttribute('Id'),
      r.getAttribute('Target') ?? '',
    ]),
  )
  const sharedXml = await read('xl/sharedStrings.xml')
  const shared = sharedXml
    ? children(parseXml(sharedXml), 'si').map((si) =>
        children(si, 't')
          // la prononciation phonétique (rPh) n'est pas du texte affiché
          .filter((t) => t.parentElement?.localName !== 'rPh')
          .map((t) => t.textContent ?? '')
          .join(''),
      )
    : []

  const sheets: Sheet[] = []
  for (const s of children(parseXml(workbook), 'sheet')) {
    const id =
      s.getAttribute('r:id') ??
      s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    const target = targets.get(id) ?? ''
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
    const xml = await read(path)
    if (!xml) continue
    const cells = new Map<string, Cell>()
    let rowCount = 0
    for (const c of children(parseXml(xml), 'c')) {
      const [row, col] = position(c.getAttribute('r') ?? '')
      if (!row) continue
      const type = c.getAttribute('t')
      const v = children(c, 'v')[0]?.textContent ?? null
      const formula = children(c, 'f')[0]?.textContent ?? null
      let value: CellValue = null
      if (type === 's') value = v === null ? null : (shared[Number(v)] ?? null)
      else if (type === 'inlineStr')
        value = children(c, 't')
          .map((t) => t.textContent)
          .join('')
      else if (type === 'str' || type === 'e') value = v
      else if (type === 'b') value = v === '1'
      else if (v !== null && v !== '') value = Number(v)
      if (value === null && formula === null) continue
      cells.set(`${row}:${col}`, { value, formula: formula === null ? null : `=${formula}` })
      rowCount = Math.max(rowCount, row)
    }
    sheets.push(new Sheet(s.getAttribute('name') ?? '', cells, rowCount))
  }
  return sheets
}
