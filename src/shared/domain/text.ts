const INVISIBLE_CHARS = /[\p{Cf}\u0000-\u0008\u000E-\u001F\u007F-\u009F]/gu
const WHITESPACE_RUNS = /\s+/gu
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

export function normalizeText(raw: string): string {
  return raw.normalize('NFC').replace(INVISIBLE_CHARS, '').replace(WHITESPACE_RUNS, ' ').trim()
}

export function normalizeSearch(raw: string): string {
  return normalizeText(raw).toLowerCase()
}

export function hasLettersOrDigits(text: string): boolean {
  return LETTER_OR_DIGIT.test(text)
}
