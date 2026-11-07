import { describe, expect, it } from 'vitest'
import { normalizeTitle } from '@/modules/notes/domain/note'

describe('normalizeTitle', () => {
  it('collapses inner whitespace and trims the ends', () => {
    expect(normalizeTitle('  Аренда   офиса ')).toBe('Аренда офиса')
  })

  it('turns a whitespace-only title into an empty string', () => {
    expect(normalizeTitle(' \n\t ')).toBe('')
  })
})
