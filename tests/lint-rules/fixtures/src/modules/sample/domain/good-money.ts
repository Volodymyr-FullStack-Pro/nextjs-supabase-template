import { z } from 'zod'

import { decimalPattern, SCALE } from '@/shared/domain/decimal-input'
import { money } from '@/shared/domain/money'

const YEAR_LENGTH = 4
const FRACTION_DIGITS = { EUR: 2, USD: 2, JPY: 0 } as const

export const PaymentSchema = z.object({
  id: z.string(),
  amount: z.string().regex(decimalPattern(SCALE.fiat)),
  rate: z.coerce.string().regex(decimalPattern(SCALE.rate)),
  currency: z.enum(['EUR', 'USD', 'JPY']),
})
export type Payment = z.infer<typeof PaymentSchema>

export function isOverLimit(amount: string, limit: string): boolean {
  return money(amount).gt(limit)
}

export function costOf(quantity: string, price: string, fee: string): string {
  // D-041: комиссия прибавляется после умножения, округление — один раз при выводе
  return money(quantity).times(price).plus(fee).toFixed()
}

export function rounded(payment: Payment): string {
  return money(payment.amount).toFixed(FRACTION_DIGITS[payment.currency])
}

export function yearOf(day: string): number {
  return Number.parseInt(day.slice(0, YEAR_LENGTH), 10)
}

export function isDue(dueAt: Date, now: Date): boolean {
  return dueAt.getTime() <= now.getTime()
}

export function titleOf(title: string | null): string {
  return title || 'Без названия'
}
