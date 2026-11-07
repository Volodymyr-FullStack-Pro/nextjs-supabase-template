'use client'

import { debounce, useQueryState } from 'nuqs'
import { Input } from '@/shared/ui/input'
import { notesSearchParams } from './search-params'

const SEARCH_DEBOUNCE_MS = 300

export function NotesSearch() {
  const [search, setSearch] = useQueryState(
    'q',
    notesSearchParams.q.withOptions({
      shallow: false,
      limitUrlUpdates: debounce(SEARCH_DEBOUNCE_MS),
    }),
  )
  return (
    <Input
      type="search"
      aria-label="Поиск по заметкам"
      placeholder="Поиск"
      value={search}
      onChange={(event) => void setSearch(event.target.value === '' ? null : event.target.value)}
    />
  )
}
