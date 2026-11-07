import { createLoader, parseAsString } from 'nuqs/server'

/** Параметры URL страницы заметок: одно описание для клиента (useQueryState) и сервера (loader). */
// Ключ в URL короткий (q), в коде — полное имя переменной.
export const notesSearchParams = {
  q: parseAsString.withDefault(''),
}

export const loadNotesSearchParams = createLoader(notesSearchParams)
