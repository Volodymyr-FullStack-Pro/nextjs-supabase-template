import { money } from '@/shared/domain/money'

export function addAsNumbers(left: string, right: string): number {
  return Number(left) + Number(right) // expect: local/pure-core
}

export function parsed(total: string): number[] {
  return [
    parseFloat(total), // expect: local/pure-core
    Number.parseFloat(total), // expect: local/pure-core
    +total, // expect: local/pure-core
    money(total).toNumber(), // expect: local/pure-core
  ]
}

export function today(): string {
  return new Date().toISOString() // expect: local/pure-core
}

export function isOverdue(dueAt: number): boolean {
  return dueAt < Date.now() // expect: local/pure-core
}
