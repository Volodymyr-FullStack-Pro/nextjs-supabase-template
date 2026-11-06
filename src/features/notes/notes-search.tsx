'use client'

import { useQueryState } from 'nuqs'
import { Input } from '@/components/ui/input'
import { notesSearchParams } from './search-params'

/** Фильтр живёт в URL (nuqs): ссылку можно скинуть, «назад» работает; shallow: false — сервер перечитывает список. */
export function NotesSearch() {
  const [q, setQ] = useQueryState('q', notesSearchParams.q.withOptions({ shallow: false }))
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
