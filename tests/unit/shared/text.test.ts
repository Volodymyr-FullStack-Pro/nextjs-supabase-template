import { describe, expect, it } from 'vitest'

import {
  hasLettersOrDigits,
  normalizeMultiline,
  normalizeSearch,
  normalizeText,
} from '@/shared/domain/text'

describe('normalizeText', () => {
  it('collapses inner whitespace and trims the ends', () => {
    expect(normalizeText('  Аренда \n\t офиса ')).toBe('Аренда офиса')
  })

  it('removes zero-width, soft-hyphen and control characters', () => {
    expect(normalizeText('Аренда​ ­офиса\u0007')).toBe('Аренда офиса')
  })

  it('keeps joiners that glue emoji and scripts together', () => {
    expect(normalizeText('👨‍👩‍👧 می‌خواهم')).toBe('👨‍👩‍👧 می‌خواهم')
  })

  it('unifies composed and decomposed letters', () => {
    expect(normalizeText('é')).toBe('é')
  })

  it('turns whitespace-only text into an empty string', () => {
    expect(normalizeText(' \n\t ')).toBe('')
  })
})

describe('normalizeMultiline', () => {
  it('keeps paragraphs but collapses spaces and extra blank lines', () => {
    expect(normalizeMultiline('  Первый   абзац \r\n\r\n\r\n\r\nВторой\tабзац  \n')).toBe(
      'Первый абзац\n\nВторой абзац',
    )
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
