import Decimal from 'decimal.js'

import { MINUS, SCALE } from './decimal-input'
import { DEFAULT_LOCALE } from './locale'

const DECIMAL_PRECISION = 64

Decimal.set({ precision: DECIMAL_PRECISION, rounding: Decimal.ROUND_HALF_EVEN })

export const money = (value: string | Decimal): Decimal => new Decimal(value)

const NBSP = '\u00A0'
const LETTER_CODE = /^[A-Z]{3}$/u
const DECIMAL_PROBE = 1.5
const ISO_CURRENCIES = new Set(Intl.supportedValuesOf('currency'))

export function shareOf(value: string, fraction: string): string {
  return money(value).times(fraction).toFixed()
}

type MoneyFormat = { currency?: string; locale?: string; fractionDigits?: number }

function currencySymbol(currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
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
  const rounded = money(amount).toDecimalPlaces(fractionDigits ?? SCALE.quantity)
  const fixed =
    fractionDigits === undefined ? rounded.abs().toFixed() : rounded.abs().toFixed(fractionDigits)
  const sign = rounded.isNegative() && !rounded.isZero() ? MINUS : ''
  return { sign, digits: groupDigits(fixed, locale) }
}

export function formatMoney(
  amount: string,
  { currency = 'EUR', locale = DEFAULT_LOCALE, fractionDigits }: MoneyFormat = {},
): string {
  if (!ISO_CURRENCIES.has(currency)) {
    const { sign, digits } = signedDigits(amount, locale, fractionDigits)
    return `${sign}${digits}${NBSP}${currency}`
  }
  const { sign, digits } = signedDigits(amount, locale, fractionDigits ?? 0)
  const symbol = currencySymbol(currency, locale)
  return LETTER_CODE.test(symbol) ? `${sign}${digits}${NBSP}${symbol}` : `${sign}${symbol}${digits}`
}
