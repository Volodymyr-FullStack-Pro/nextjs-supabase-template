import Decimal from 'decimal.js'

// Деньги: в базе numeric как строка, в расчётах Decimal, number — только для графиков.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN })

export const money = (value: string | Decimal): Decimal => new Decimal(value)

/** Доля инвестора в оценке: valuation × share, две знака после запятой. */
export function investorShare(valuation: string, share: string): string {
  return money(valuation).times(share).toFixed(2)
}

/** `€4 218 400` для EUR, `1 250 USD` для остальных; минус — U+2212; разделитель тысяч — обычный пробел. */
export function formatMoney(amount: string, currency = 'EUR'): string {
  const rounded = money(amount).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN)
  const digits = rounded
    .abs()
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const sign = rounded.isNegative() ? '−' : ''
  return currency === 'EUR' ? `${sign}€${digits}` : `${sign}${digits} ${currency}`
}
