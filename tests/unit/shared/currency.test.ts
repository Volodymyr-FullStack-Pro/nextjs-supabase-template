import { describe, expect, it } from 'vitest'

import { currencyFractionDigits, isIsoCurrency } from '@/shared/domain/currency'

describe('isIsoCurrency', () => {
  it('accepts an ISO 4217 code and rejects a ticker, an unknown or a lowercase code', () => {
    expect(isIsoCurrency('EUR')).toBe(true)
    expect(isIsoCurrency('JPY')).toBe(true)
    expect(isIsoCurrency('BTC')).toBe(false)
    expect(isIsoCurrency('ZZZ')).toBe(false)
    expect(isIsoCurrency('eur')).toBe(false)
  })
})

describe('currencyFractionDigits', () => {
  it('tells how many decimals the currency has', () => {
    expect(currencyFractionDigits('EUR')).toBe(2)
    expect(currencyFractionDigits('JPY')).toBe(0)
    expect(currencyFractionDigits('KWD')).toBe(3)
  })

  it('knows no minor unit for a ticker', () => {
    expect(currencyFractionDigits('BTC')).toBeUndefined()
    expect(currencyFractionDigits('USDT')).toBeUndefined()
  })
})
