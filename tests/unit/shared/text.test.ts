import { describe, expect, it } from 'vitest'

import { hasLettersOrDigits, normalizeSearch, normalizeText } from '@/shared/domain/text'

describe('normalizeText', () => {
  it('collapses inner whitespace and trims the ends', () => {
    expect(normalizeText('  Аренда \n\t офиса ')).toBe('Аренда офиса')
  })

  it('removes invisible and control characters', () => {
    expect(normalizeText('Аренда​ офиса\u0007')).toBe('Аренда офиса')
  })

  it('unifies composed and decomposed letters', () => {
    expect(normalizeText('é')).toBe('é')
  })

  it('turns whitespace-only text into an empty string', () => {
    expect(normalizeText(' \n\t ')).toBe('')
  })
})

describe('normalizeSearch', () => {
  it('lowercases the normalized text', () => {
    expect(normalizeSearch('  АРЕНДА ')).toBe('аренда')
  })
})

describe('hasLettersOrDigits', () => {
  it('accepts text with a letter or a digit', () => {
    expect(hasLettersOrDigits('Q3')).toBe(true)
  })

  it('rejects punctuation only', () => {
    expect(hasLettersOrDigits('--- !!!')).toBe(false)
  })
})
