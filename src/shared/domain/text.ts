const INVISIBLE_CHARS = /[\u0000-\u0008\u000E-\u001F\u007F-\u009F­​⁠﻿]/gu
const WHITESPACE_RUNS = /\s+/gu
const LINE_SPACE_RUNS = /[ \t]+/gu
const LINE_EDGES = /^ | $/gmu
const BLANK_LINE_RUNS = /\n{3,}/gu
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

function clean(raw: string): string {
  return raw.normalize('NFC').replace(INVISIBLE_CHARS, '')
}

export function normalizeText(raw: string): string {
  return clean(raw).replace(WHITESPACE_RUNS, ' ').trim()
}

export function normalizeMultiline(raw: string): string {
  return clean(raw)
    .replace(/\r\n?/gu, '\n')
    .replace(LINE_SPACE_RUNS, ' ')
    .replace(LINE_EDGES, '')
    .replace(BLANK_LINE_RUNS, '\n\n')
    .trim()
}

export function normalizeSearch(raw: string): string {
  return normalizeText(raw).toLowerCase()
}

export function hasLettersOrDigits(text: string): boolean {
  return LETTER_OR_DIGIT.test(text)
}
