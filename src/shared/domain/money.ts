import Decimal from 'decimal.js'

import { currencyFractionDigits, isIsoCurrency } from './currency'
import { MINUS } from './decimal-input'
import { DEFAULT_LOCALE } from './locale'

const DECIMAL_PRECISION = 64
const TICKER_FRACTION_DIGITS = 8

const MoneyDecimal = Decimal.clone({
  precision: DECIMAL_PRECISION,
  rounding: Decimal.ROUND_HALF_EVEN,
})

export type Money = Decimal

const NOT_A_FINITE_DECIMAL = 'money: expected a finite decimal number'

function toDecimal(value: string | Decimal): Money {
  try {
    return new MoneyDecimal(value)
  } catch {
    throw new RangeError(NOT_A_FINITE_DECIMAL)
  }
}

export const money = (value: string | Decimal): Money => {
  const result = toDecimal(value)
  if (!result.isFinite()) throw new RangeError(NOT_A_FINITE_DECIMAL)
  return result
}

const NBSP = '\u00A0'
const LETTER_CODE = /^[A-Z]{3}$/u
const DECIMAL_PROBE = 1.5
export function exceedsCurrencyPrecision(amount: string, currency: string): boolean {
  const fractionDigits = currencyFractionDigits(currency)
  return fractionDigits !== undefined && money(amount).decimalPlaces() > fractionDigits
}

export function shareOf(value: string, fraction: string): string {
  return money(value).times(money(fraction)).toFixed()
}

type MoneyFormat = { currency: string; locale?: string; fractionDigits?: number }

function currencySymbol(currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  })
    .formatToParts(0)
    .filter((part) => part.type === 'currency')
    .map((part) => part.value)
    .join('')
}

function groupDigits(fixed: string, locale: string): string {
  const point = fixed.indexOf('.')
  const integerPart = point < 0 ? fixed : fixed.slice(0, point)
  const grouped = new Intl.NumberFormat(locale).format(BigInt(integerPart))
  if (point < 0) return grouped
  const decimalSeparator = new Intl.NumberFormat(locale).format(DECIMAL_PROBE).charAt(1)
  return `${grouped}${decimalSeparator}${fixed.slice(point + 1)}`
}

function signedDigits(amount: string, locale: string, fractionDigits: number | undefined) {
  const rounded = money(amount).toDecimalPlaces(fractionDigits ?? TICKER_FRACTION_DIGITS)
  const fixed =
    fractionDigits === undefined ? rounded.abs().toFixed() : rounded.abs().toFixed(fractionDigits)
  const sign = rounded.isNegative() && !rounded.isZero() ? MINUS : ''
  return { sign, digits: groupDigits(fixed, locale) }
}

export function formatMoney(
  amount: string,
  { currency, locale = DEFAULT_LOCALE, fractionDigits }: MoneyFormat,
): string {
  if (!isIsoCurrency(currency)) {
    const { sign, digits } = signedDigits(amount, locale, fractionDigits)
    return `${sign}${digits}${NBSP}${currency}`
  }
  const { sign, digits } = signedDigits(
    amount,
    locale,
    fractionDigits ?? currencyFractionDigits(currency),
  )
  const symbol = currencySymbol(currency, locale)
  return LETTER_CODE.test(symbol) ? `${sign}${digits}${NBSP}${symbol}` : `${sign}${symbol}${digits}`
}
