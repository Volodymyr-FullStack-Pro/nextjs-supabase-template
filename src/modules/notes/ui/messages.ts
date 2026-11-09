import { NOTE_TITLE_MAX, type NoteMessageKey } from '../domain/note'

export const notesMessages = {
  'note.title.required': 'Введите заголовок',
  'note.title.tooLong': `Не длиннее ${String(NOTE_TITLE_MAX)} символов`,
  'note.title.meaningless': 'Заголовок должен содержать буквы или цифры',
} as const satisfies Record<NoteMessageKey, string>
