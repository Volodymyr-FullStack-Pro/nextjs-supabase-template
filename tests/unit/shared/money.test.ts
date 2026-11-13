import { describe, expect, it } from 'vitest'

import { decimalPattern, parseDecimalInput, SCALE } from '@/shared/domain/decimal-input'
import { exceedsCurrencyPrecision, formatMoney, money, shareOf } from '@/shared/domain/money'

const NBSP = ' '

describe('money helpers', () => {
  it('multiplies a value by a fraction exactly', () => {
    expect(shareOf('3080000', '0.6')).toBe('1848000')
    expect(shareOf('1760000', '0.35')).toBe('616000')
  })

  it('keeps the full precision of a share instead of rounding to cents', () => {
    expect(shareOf('1000.01', '0.3333333333')).toBe('333.336666633333')
    expect(shareOf('1234567890123456.78', '0.1234567890')).toBe('152415787517146.78763907942')
  })

  it('adds amounts with more than 15 significant digits exactly', () => {
    expect(money('1234567890123456.78').plus('0.01').toFixed()).toBe('1234567890123456.79')
  })

  it('adds decimals without floating point drift', () => {
    expect(money('0.1').plus('0.2').toString()).toBe('0.3')
  })
})

describe('money', () => {
  it('refuses NaN and infinity instead of carrying them into a total', () => {
    expect(() => money('NaN')).toThrow(RangeError)
    expect(() => money('Infinity')).toThrow(RangeError)
  })

  it.each(['12 345,67 secret', 'NaN', '-Infinity', ''])(
    'refuses %j without quoting it: the text of the error goes to the log and to Sentry',
    (value) => {
      expect(() => money(value)).toThrow(new RangeError('money: expected a finite decimal number'))
    },
  )

  it.each([
    ['formatMoney', () => formatMoney('12 345,67 secret', { currency: 'EUR' })],
    ['formatMoney of a ticker', () => formatMoney('12 345,67 secret', { currency: 'BTC' })],
    ['exceedsCurrencyPrecision', () => exceedsCurrencyPrecision('12 345,67 secret', 'EUR')],
    ['shareOf (the value)', () => shareOf('12 345,67 secret', '0.5')],
    ['shareOf (the fraction)', () => shareOf('100', '12 345,67 secret')],
  ])('%s refuses a non-numeric amount without quoting it', (_name, run) => {
    expect(run).toThrow(new RangeError('money: expected a finite decimal number'))
  })
})

describe('formatMoney', () => {
  it('formats EUR with non-breaking thousands separators and the cents of the currency', () => {
    expect(formatMoney('4218400', { currency: 'EUR' })).toBe(`€4${NBSP}218${NBSP}400,00`)
    expect(formatMoney('1250.49', { currency: 'EUR' })).toBe(`€1${NBSP}250,49`)
  })

  it('formats negative amounts with a real minus sign', () => {
    expect(formatMoney('-8500', { currency: 'EUR' })).toBe(`−€8${NBSP}500,00`)
  })

  it('drops the sign of an amount that rounds to zero', () => {
    expect(formatMoney('-0.004', { currency: 'EUR' })).toBe('€0,00')
  })

  it('rounds half to even', () => {
    expect(formatMoney('2.5', { currency: 'EUR', fractionDigits: 0 })).toBe('€2')
    expect(formatMoney('3.5', { currency: 'EUR', fractionDigits: 0 })).toBe('€4')
    expect(formatMoney('2.665', { currency: 'EUR' })).toBe('€2,66')
  })

  it('shows no decimals for a currency without minor units', () => {
    expect(formatMoney('1250000.49', { currency: 'KRW' })).toBe(`₩1${NBSP}250${NBSP}000`)
    expect(formatMoney('10', { currency: 'JPY', locale: 'en-US' })).toBe('¥10')
  })

  it('distinguishes the dollars and yuan of different countries', () => {
    expect(formatMoney('10', { currency: 'USD', locale: 'en-US' })).toBe('$10.00')
    expect(formatMoney('10', { currency: 'CAD', locale: 'en-US' })).toBe('CA$10.00')
    expect(formatMoney('10', { currency: 'CNY', locale: 'en-US' })).toBe('CN¥10.00')
  })

  it('follows the English locale and keeps the requested decimals', () => {
    expect(formatMoney('4218400.5', { currency: 'EUR', locale: 'en-US', fractionDigits: 2 })).toBe(
      '€4,218,400.50',
    )
  })

  it('puts a letter currency code after the number', () => {
    expect(formatMoney('1250.49', { currency: 'AED' })).toBe(`1${NBSP}250,49${NBSP}AED`)
  })

  it('shows an amount with more than 15 significant digits exactly', () => {
    expect(formatMoney('1234567890123456.78', { currency: 'EUR', fractionDigits: 2 })).toBe(
      `€1${NBSP}234${NBSP}567${NBSP}890${NBSP}123${NBSP}456,78`,
    )
  })

  it('writes a crypto ticker after the number with up to eight decimals', () => {
    expect(formatMoney('1000.12345678', { currency: 'USDT' })).toBe(
      `1${NBSP}000,12345678${NBSP}USDT`,
    )
    expect(formatMoney('0.5', { currency: 'BTC' })).toBe(`0,5${NBSP}BTC`)
    expect(formatMoney('-0.123456789', { currency: 'BTC' })).toBe(`−0,12345679${NBSP}BTC`)
  })

  it('keeps the requested decimals for a ticker', () => {
    expect(formatMoney('1.5', { currency: 'ETH', fractionDigits: 4 })).toBe(`1,5000${NBSP}ETH`)
  })

  it('drops the sign of a ticker amount that rounds to zero', () => {
    expect(formatMoney('-0.000000001', { currency: 'BTC' })).toBe(`0${NBSP}BTC`)
  })
})

describe('parseDecimalInput', () => {
  it('reads a Russian amount with spaces and a decimal comma', () => {
    expect(parseDecimalInput('1 234,56')).toBe('1234.56')
  })

  it('reads a decimal point typed on a phone keypad of another region', () => {
    expect(parseDecimalInput('1234.56')).toBe('1234.56')
    expect(parseDecimalInput('0.5')).toBe('0.5')
  })

  it('reads grouping typed with apostrophes or narrow spaces', () => {
    expect(parseDecimalInput("1'234,5")).toBe('1234.5')
    expect(parseDecimalInput('1\u202F234\u202F567')).toBe('1234567')
  })

  it('rejects an amount with both a comma and a point instead of guessing', () => {
    expect(parseDecimalInput('1,234.56')).toBeNull()
    expect(parseDecimalInput('1.234,56')).toBeNull()
    expect(parseDecimalInput('1.2.3')).toBeNull()
  })

  it('reads a negative amount typed with a minus sign', () => {
    expect(parseDecimalInput('−12,5')).toBe('-12.5')
  })

  it('rejects text that is not a number', () => {
    expect(parseDecimalInput('12,5 евро')).toBeNull()
  })

  it('allows two decimals for a fiat amount by default', () => {
    expect(parseDecimalInput('10,25')).toBe('10.25')
    expect(parseDecimalInput('10,255')).toBeNull()
  })

  it('takes the allowed scale of a quantity, price or whole number', () => {
    expect(parseDecimalInput('0,12345678', SCALE.quantity)).toBe('0.12345678')
    expect(parseDecimalInput('0,123456789012345678', SCALE.quantity)).toBe('0.123456789012345678')
    expect(parseDecimalInput('0,1234567890123456789', SCALE.quantity)).toBeNull()
    expect(parseDecimalInput('1,0000000001', SCALE.price)).toBe('1.0000000001')
    expect(parseDecimalInput('0,000000000049', SCALE.price)).toBe('0.000000000049')
    expect(parseDecimalInput('12', 0)).toBe('12')
    expect(parseDecimalInput('12,5', 0)).toBeNull()
  })

  it('reads an amount with more than 15 significant digits as typed', () => {
    expect(parseDecimalInput('1 234 567 890 123 456,78')).toBe('1234567890123456.78')
  })

  it('refuses more than 16 integer digits of a fiat amount instead of overflowing numeric(18,2)', () => {
    expect(parseDecimalInput('9'.repeat(16))).toBe('9'.repeat(16))
    expect(parseDecimalInput('9'.repeat(17))).toBeNull()
  })

  it('allows 20 integer digits for quantities, prices and rates (numeric(38,18))', () => {
    expect(parseDecimalInput('9'.repeat(20), SCALE.quantity)).toBe('9'.repeat(20))
    expect(parseDecimalInput('9'.repeat(21), SCALE.quantity)).toBeNull()
    expect(parseDecimalInput('9'.repeat(17), SCALE.price)).toBe('9'.repeat(17))
  })

  it('keeps a share within two integer digits of numeric(12,10)', () => {
    expect(parseDecimalInput('0,3333333333', SCALE.share)).toBe('0.3333333333')
    expect(parseDecimalInput('99,5', SCALE.share)).toBe('99.5')
    expect(parseDecimalInput('100', SCALE.share)).toBeNull()
  })
})

describe('decimalPattern', () => {
  it('matches a decimal string from an API with up to the given decimals', () => {
    expect(decimalPattern(SCALE.rate).test('-1.0000000001')).toBe(true)
    expect(decimalPattern().test('1.001')).toBe(false)
  })

  it('refuses a scale outside 0 to 18', () => {
    expect(() => decimalPattern(19)).toThrow(RangeError)
    expect(() => decimalPattern(-1)).toThrow(RangeError)
    expect(() => decimalPattern(1.5)).toThrow(RangeError)
  })
})

describe('exceedsCurrencyPrecision', () => {
  it('rejects an amount more precise than the currency: 100.50 yen would be shown as ¥100', () => {
    expect(exceedsCurrencyPrecision('100.50', 'JPY')).toBe(true)
    expect(exceedsCurrencyPrecision('100.505', 'EUR')).toBe(true)
    expect(exceedsCurrencyPrecision('-0.0001', 'KWD')).toBe(true)
  })

  it('accepts an amount within the precision of the currency', () => {
    expect(exceedsCurrencyPrecision('100', 'JPY')).toBe(false)
    expect(exceedsCurrencyPrecision('100.50', 'EUR')).toBe(false)
    expect(exceedsCurrencyPrecision('1.234', 'KWD')).toBe(false)
  })

  it('ignores trailing zeros: 100.00 yen is a whole amount', () => {
    expect(exceedsCurrencyPrecision('100.00', 'JPY')).toBe(false)
    expect(exceedsCurrencyPrecision('100.500', 'EUR')).toBe(false)
  })

  it('leaves the precision of a ticker to the scale of the column', () => {
    expect(exceedsCurrencyPrecision('0.00000001', 'BTC')).toBe(false)
  })
})
