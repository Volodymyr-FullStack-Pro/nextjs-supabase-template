import { describe, expect, it } from 'vitest'

import { CreateNoteInput } from '@/modules/notes/domain/note'

describe('CreateNoteInput', () => {
  it('normalizes the title and parses the amount while validating', () => {
    expect(CreateNoteInput.parse({ title: '  Аренда ​  офиса ', amount: '1 234,56' })).toEqual({
      title: 'Аренда офиса',
      amount: '1234.56',
    })
  })

  it('rejects a title that is empty after normalization', () => {
    expect(CreateNoteInput.safeParse({ title: ' \n\t ', amount: '1' }).success).toBe(false)
  })

  it('rejects an amount that is not a decimal number with a message key', () => {
    const result = CreateNoteInput.safeParse({ title: 'Аренда', amount: '12,5 евро' })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['note.amount.invalid'])
  })

  it('rejects an amount with more decimals than a fiat currency has', () => {
    expect(CreateNoteInput.safeParse({ title: 'Аренда', amount: '10,255' }).success).toBe(false)
  })
})
