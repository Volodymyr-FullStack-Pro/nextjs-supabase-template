'use client'

import { debounce, useQueryState } from 'nuqs'
import { Input } from '@/shared/ui/input'
import { notesSearchParams } from './search-params'

/** Фильтр живёт в URL (nuqs): ссылку можно скинуть; shallow: false — сервер перечитывает список, debounce бережёт базу. */
export function NotesSearch() {
  const [q, setQ] = useQueryState(
    'q',
    notesSearchParams.q.withOptions({ shallow: false, limitUrlUpdates: debounce(300) }),
  )
  return (
    <Input
      type="search"
      aria-label="Поиск по заметкам"
      placeholder="Поиск"
      value={q}
      onChange={(event) => void setQ(event.target.value === '' ? null : event.target.value)}
    />
  )
}
