import { z } from 'zod'

import { money, type Money } from '@/shared/domain/money'

export type Payment = {
  id: string
  amount: number // expect: local/money-as-number
  opening_balance: number // expect: local/money-as-number
  quantity: number // expect: local/money-as-number
}

export const PaymentInput = z.object({
  fee: z.number(), // expect: local/money-as-number
  taxRate: z.coerce.number(), // expect: local/money-as-number
})

export function isOverLimit(amount: string, limit: string): boolean {
  return amount > limit // expect: local/money-as-number
}

// expect: local/money-as-number
export function withFee(net: string, fee: number): string {
  return `${net}:${String(fee)}`
}

export function totalOf(prices: number[]): number {
  let sum = 0
  for (const price of prices) sum += price // expect: local/money-as-number
  return sum
}

export function isGreater(left: string, right: string): boolean {
  return money(left) > money(right) // expect: local/no-money-operators
}

export function isSame(left: Money, right: Money | null): boolean {
  return left === right // expect: local/no-money-operators
}

export function isMissing(total: Money | null): boolean {
  return total === null
}

// expect: local/no-enum
export enum Direction {
  In = 'in',
  Out = 'out',
}
