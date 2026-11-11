import { describe, expect, it } from 'vitest'

import { CreateNoteInput } from '@/modules/notes/domain/note'

const REQUEST_ID = '00000000-0000-4000-8000-000000000001'
const valid = { title: 'Аренда', amount: '1', currency: 'EUR', clientRequestId: REQUEST_ID }

describe('CreateNoteInput', () => {
  it('normalizes the title and parses the amount while validating', () => {
    expect(
      CreateNoteInput.parse({ ...valid, title: '  Аренда ​  офиса ', amount: '1 234,56' }),
    ).toEqual({ ...valid, title: 'Аренда офиса', amount: '1234.56' })
  })

  it('rejects a title that is empty after normalization', () => {
    expect(CreateNoteInput.safeParse({ ...valid, title: ' \n\t ' }).success).toBe(false)
  })

  it('rejects an amount that is not a decimal number with a message key', () => {
    const result = CreateNoteInput.safeParse({ ...valid, amount: '12,5 евро' })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['note.amount.invalid'])
  })

  it('rejects an amount with more decimals than a fiat currency has', () => {
    expect(CreateNoteInput.safeParse({ ...valid, amount: '10,255' }).success).toBe(false)
  })

  it('normalizes the currency code to upper case', () => {
    expect(CreateNoteInput.parse({ ...valid, currency: ' usd ' }).currency).toBe('USD')
  })

  it('rejects a currency outside ISO 4217 with a message key', () => {
    const result = CreateNoteInput.safeParse({ ...valid, currency: 'ZZZ' })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['note.currency.invalid'])
  })

  it('rejects a request id that is not a uuid', () => {
    expect(CreateNoteInput.safeParse({ ...valid, clientRequestId: '' }).success).toBe(false)
  })
})
