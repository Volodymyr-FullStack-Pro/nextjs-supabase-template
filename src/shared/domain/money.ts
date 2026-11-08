import Decimal from 'decimal.js'

const DECIMAL_PRECISION = 28

Decimal.set({ precision: DECIMAL_PRECISION, rounding: Decimal.ROUND_HALF_EVEN })

export const money = (value: string | Decimal): Decimal => new Decimal(value)

const MONEY_SCALE = 2
const MINUS = '−'
const NBSP = ' '
const LETTER_CODE = /^[A-Z]{3}$/u
const GROUPING = /[\s  '’]/gu
const DECIMAL_MARKS = /[.,]/gu
const PLAIN_DECIMAL = /^-?\d+(?:\.\d+)?$/u
const DECIMAL_PROBE = 1.5

export function shareOf(value: string, fraction: string): string {
  return money(value).times(fraction).toFixed(MONEY_SCALE)
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

export function formatMoney(
  amount: string,
  { currency = 'EUR', locale = 'ru-RU', fractionDigits = 0 }: MoneyFormat = {},
): string {
  const rounded = money(amount).toDecimalPlaces(fractionDigits)
  const digits = groupDigits(rounded.abs().toFixed(fractionDigits), locale)
  const sign = rounded.isNegative() && !rounded.isZero() ? MINUS : ''
  const symbol = currencySymbol(currency, locale)
  return LETTER_CODE.test(symbol) ? `${sign}${digits}${NBSP}${symbol}` : `${sign}${symbol}${digits}`
}

export function parseDecimalInput(raw: string): string | null {
  const compact = raw.replace(GROUPING, '').replace(MINUS, '-')
  if ((compact.match(DECIMAL_MARKS) ?? []).length > 1) return null
  const normalized = compact.replace(',', '.')
  return PLAIN_DECIMAL.test(normalized) ? normalized : null
}
