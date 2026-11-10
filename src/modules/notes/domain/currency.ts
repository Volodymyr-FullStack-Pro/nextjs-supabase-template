import { DEFAULT_LOCALE } from '@/shared/domain/locale'

const ISO_CURRENCIES = new Set(Intl.supportedValuesOf('currency'))
const TRAILING_ZEROS = /0+$/u

export function isIsoCurrency(code: string): boolean {
  return ISO_CURRENCIES.has(code)
}

export function currencyFractionDigits(currency: string): number {
  const fraction = new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency })
    .formatToParts(0)
    .find((part) => part.type === 'fraction')
  return fraction?.value.length ?? 0
}

export function exceedsCurrencyPrecision(amount: string, currency: string): boolean {
  const fraction = (amount.split('.')[1] ?? '').replace(TRAILING_ZEROS, '')
  return fraction.length > currencyFractionDigits(currency)
}
