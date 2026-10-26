import { planFixture as fixture } from '@/features/plan/__fixtures__/fixture'
import { readXlsx, XlsxError } from './xlsx'

describe('readXlsx', () => {
  it('lit les onglets, les textes, les nombres et les formules', async () => {
    const sheets = await readXlsx(fixture())
    expect(sheets.map((s) => s.name)).toEqual([
      'RECAP',
      '2026 France',
      '2027 France',
      '2028 Canada',
    ])
    const recap = sheets[0]!
    expect(recap.text(5, 1)).toBe('Période')
    expect(recap.number(6, 3)).toBe(500)
    expect(recap.cell(6, 4)?.formula).toBe("='2026 France'!A200")
    expect(sheets[1]!.text(1, 1)).toBe('📅  2026 — France')
  })

  it('refuse un fichier qui n’est pas un classeur', async () => {
    await expect(readXlsx(new TextEncoder().encode('pas un zip').buffer)).rejects.toThrow(XlsxError)
  })
})
