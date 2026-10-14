export type CsvValue = string | number | null

/**
 * Cellule CSV : guillemets si nécessaire, et neutralisation des formules
 * (une valeur commençant par = + - @ serait exécutée par un tableur).
 */
function cell(value: CsvValue): string {
  if (value === null) return ''
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV au format attendu par un tableur français : séparateur `;`, fins de ligne CRLF. */
export function toCSV(headers: string[], rows: CsvValue[][]): string {
  return [headers, ...rows].map((row) => row.map(cell).join(';')).join('\r\n') + '\r\n'
}

/** Déclenche le téléchargement d'un fichier généré côté client. */
export function downloadFile(filename: string, content: string, mime: string) {
  // BOM pour que les tableurs détectent l'UTF-8 (accents)
  const blob = new Blob([mime.startsWith('text/csv') ? '﻿' : '', content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
