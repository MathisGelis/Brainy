import { toCSV } from './csv'

describe('toCSV', () => {
  it('sépare par ; avec des fins de ligne CRLF', () => {
    expect(toCSV(['a', 'b'], [[1, 'x']])).toBe('a;b\r\n1;x\r\n')
  })

  it('met entre guillemets les valeurs avec ; " ou retour à la ligne', () => {
    expect(toCSV(['v'], [['un;deux'], ['dit "oui"'], ['ligne\nsuivante']])).toBe(
      'v\r\n"un;deux"\r\n"dit ""oui"""\r\n"ligne\nsuivante"\r\n',
    )
  })

  it('laisse vide une valeur nulle', () => {
    expect(toCSV(['a', 'b'], [[null, 'x']])).toBe('a;b\r\n;x\r\n')
  })

  it('neutralise les formules de tableur', () => {
    expect(toCSV(['v'], [['=SOMME(A1)'], ['+33'], ['@cmd']])).toBe(
      "v\r\n'=SOMME(A1)\r\n'+33\r\n'@cmd\r\n",
    )
  })
})
