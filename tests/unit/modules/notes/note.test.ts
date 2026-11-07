import { describe, expect, it } from 'vitest'

import { CreateNoteInput } from '@/modules/notes/domain/note'

describe('CreateNoteInput', () => {
  it('normalizes the title while validating', () => {
    expect(CreateNoteInput.parse({ title: '  Аренда ​  офиса ' })).toEqual({
      title: 'Аренда офиса',
    })
  })

  it('rejects a title that is empty after normalization', () => {
    expect(CreateNoteInput.safeParse({ title: ' \n\t ' }).success).toBe(false)
  })
})
