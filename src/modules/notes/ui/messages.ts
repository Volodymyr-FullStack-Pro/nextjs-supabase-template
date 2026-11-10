import { NOTE_TITLE_MAX, type NoteMessageKey } from '../domain/note'

export const notesMessages = {
  'note.title.required': 'Введите заголовок',
  'note.title.tooLong': `Не длиннее ${String(NOTE_TITLE_MAX)} символов`,
  'note.title.meaningless': 'Заголовок должен содержать буквы или цифры',
  'note.amount.invalid': 'Введите сумму числом, например 1 234,56',
  'note.amount.tooPrecise': 'У этой валюты нет копеек: введите сумму без дробной части',
  'note.currency.invalid': 'Введите код валюты из трёх букв, например EUR',
} as const satisfies Record<NoteMessageKey, string>
