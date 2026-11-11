import { DEFAULT_LOCALE } from './locale'

const ISO_CURRENCIES = new Set(Intl.supportedValuesOf('currency'))

export function isIsoCurrency(code: string): boolean {
  return ISO_CURRENCIES.has(code)
}

export function currencyFractionDigits(currency: string): number | undefined {
  if (!isIsoCurrency(currency)) return undefined
  return new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits
}
