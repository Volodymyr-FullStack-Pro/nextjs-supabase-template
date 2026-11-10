const FIAT_SCALE = 2
const SHARE_SCALE = 10
const MAX_SCALE = 18
const MAX_INTEGER_DIGITS = 16
export const MINUS = '−'
const GROUPING = /[\s\u00A0\u202F'’]/gu
const DECIMAL_MARKS = /[.,]/gu

export const SCALE = {
  fiat: FIAT_SCALE,
  quantity: MAX_SCALE,
  price: MAX_SCALE,
  rate: MAX_SCALE,
  share: SHARE_SCALE,
} as const

function assertScale(scale: number): void {
  if (!Number.isInteger(scale) || scale < 0 || scale > MAX_SCALE) {
    throw new RangeError(
      `Scale must be an integer from 0 to ${String(MAX_SCALE)}, got ${String(scale)}`,
    )
  }
}

export function decimalPattern(scale: number = SCALE.fiat): RegExp {
  assertScale(scale)
  const fraction = scale === 0 ? '' : `(?:\\.\\d{1,${String(scale)}})?`
  return new RegExp(`^-?\\d{1,${String(MAX_INTEGER_DIGITS)}}${fraction}$`, 'u')
}

export function parseDecimalInput(raw: string, scale: number = SCALE.fiat): string | null {
  const compact = raw.replace(GROUPING, '').replace(MINUS, '-')
  if ((compact.match(DECIMAL_MARKS) ?? []).length > 1) return null
  const normalized = compact.replace(',', '.')
  return decimalPattern(scale).test(normalized) ? normalized : null
}
