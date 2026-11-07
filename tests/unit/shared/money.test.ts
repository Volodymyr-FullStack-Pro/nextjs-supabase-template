import { describe, expect, it } from 'vitest'

import { formatMoney, money, parseDecimalInput, shareOf } from '@/shared/domain/money'

const NBSP = ' '

describe('money helpers', () => {
  it('multiplies a value by a fraction exactly', () => {
    expect(shareOf('3080000', '0.6')).toBe('1848000.00')
    expect(shareOf('1760000', '0.35')).toBe('616000.00')
  })

  it('adds decimals without floating point drift', () => {
    expect(money('0.1').plus('0.2').toString()).toBe('0.3')
  })
})

describe('formatMoney', () => {
  it('formats EUR with non-breaking thousands separators and no decimals', () => {
    expect(formatMoney('4218400')).toBe(`€4${NBSP}218${NBSP}400`)
  })

  it('formats negative amounts with a real minus sign', () => {
    expect(formatMoney('-8500')).toBe(`−€8${NBSP}500`)
  })

  it('drops the sign of an amount that rounds to zero', () => {
    expect(formatMoney('-0.4')).toBe('€0')
  })

  it('rounds half to even', () => {
    expect(formatMoney('2.5')).toBe('€2')
    expect(formatMoney('3.5')).toBe('€4')
  })

  it('follows the English locale and keeps the requested decimals', () => {
    expect(formatMoney('4218400.5', { locale: 'en-US', fractionDigits: 2 })).toBe('€4,218,400.50')
  })

  it('puts a letter currency code after the number', () => {
    expect(formatMoney('1250.49', { currency: 'AED' })).toBe(`1${NBSP}250${NBSP}AED`)
  })
})

describe('parseDecimalInput', () => {
  it('reads a Russian amount with spaces and a decimal comma', () => {
    expect(parseDecimalInput('1 234,56')).toBe('1234.56')
  })

  it('reads an English amount with thousands commas', () => {
    expect(parseDecimalInput('1,234.56', '.')).toBe('1234.56')
  })

  it('reads a negative amount typed with a minus sign', () => {
    expect(parseDecimalInput('−12,5')).toBe('-12.5')
  })

  it('rejects text that is not a number', () => {
    expect(parseDecimalInput('12,5 евро')).toBeNull()
  })
})
