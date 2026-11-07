import Decimal from 'decimal.js'

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN })

export const money = (value: string | Decimal): Decimal => new Decimal(value)

const MONEY_SCALE = 2

export function shareOf(value: string, fraction: string): string {
  return money(value).times(fraction).toFixed(MONEY_SCALE)
}

export function formatMoney(amount: string, currency = 'EUR'): string {
  const rounded = money(amount).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN)
  const digits = rounded
    .abs()
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const sign = rounded.isNegative() ? '−' : ''
  return currency === 'EUR' ? `${sign}€${digits}` : `${sign}${digits} ${currency}`
}
