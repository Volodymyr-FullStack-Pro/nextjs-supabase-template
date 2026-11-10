import { describe, expect, it } from 'vitest'

import {
  currencyFractionDigits,
  exceedsCurrencyPrecision,
  isIsoCurrency,
} from '@/modules/notes/domain/currency'

describe('isIsoCurrency', () => {
  it('accepts an ISO 4217 code', () => {
    expect(isIsoCurrency('EUR')).toBe(true)
  })

  it('rejects a code outside ISO 4217', () => {
    expect(isIsoCurrency('ZZZ')).toBe(false)
    expect(isIsoCurrency('eur')).toBe(false)
  })
})

describe('currencyFractionDigits', () => {
  it.each([
    ['EUR', 2],
    ['JPY', 0],
    ['KWD', 3],
  ])('reads the number of decimals of %s', (currency, digits) => {
    expect(currencyFractionDigits(currency)).toBe(digits)
  })
})

describe('exceedsCurrencyPrecision', () => {
  it('flags decimals a currency without minor units cannot hold', () => {
    expect(exceedsCurrencyPrecision('100.50', 'JPY')).toBe(true)
  })

  it('ignores trailing zeros', () => {
    expect(exceedsCurrencyPrecision('100.00', 'JPY')).toBe(false)
  })

  it('accepts an amount without a decimal part', () => {
    expect(exceedsCurrencyPrecision('100', 'JPY')).toBe(false)
  })

  it('accepts decimals within the currency scale', () => {
    expect(exceedsCurrencyPrecision('100.50', 'EUR')).toBe(false)
  })
})
