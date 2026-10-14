import { centsToInput, formatCents, parseAmountToCents } from './money'

describe('parseAmountToCents', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12.50', 1250],
    ['0,99', 99],
    ['1 234,56 €', 123456],
    ['0.1', 10],
  ])('« %s » → %i', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected)
  })

  it('évite les erreurs de flottant (19,99 → 1999, 1,15 → 115)', () => {
    expect(parseAmountToCents('19,99')).toBe(1999)
    expect(parseAmountToCents('1,15')).toBe(115)
  })

  it.each(['', 'abc', '0', '0,00', '-5', '1,234', '12,', '1e3', '99999999999'])(
    'refuse « %s »',
    (input) => {
      expect(parseAmountToCents(input)).toBeNull()
    },
  )
})

describe('formatage', () => {
  it('formate en euros (espaces insécables normalisés)', () => {
    expect(formatCents(1250).replace(/\s/g, ' ')).toBe('12,50 €')
    expect(formatCents(123456).replace(/\s/g, ' ')).toBe('1 234,56 €')
  })

  it('produit une valeur éditable', () => {
    expect(centsToInput(1250)).toBe('12,50')
    expect(centsToInput(5)).toBe('0,05')
    expect(centsToInput(100000)).toBe('1000,00')
    expect(parseAmountToCents(centsToInput(1999))).toBe(1999)
  })
})
