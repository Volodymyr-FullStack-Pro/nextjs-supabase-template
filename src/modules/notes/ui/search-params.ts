import { createLoader, parseAsString } from 'nuqs/server'

export const notesSearchParams = {
  q: parseAsString.withDefault(''),
}

export const loadNotesSearchParams = createLoader(notesSearchParams)
