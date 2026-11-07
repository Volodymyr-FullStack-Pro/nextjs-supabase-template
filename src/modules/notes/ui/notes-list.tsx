import type { SearchParams } from 'nuqs/server'

import { formatDate } from '@/shared/domain/time'
import { verifySession } from '@/shared/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import { notes } from '../server'
import { loadNotesSearchParams } from './search-params'

export async function NotesList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await verifySession()
  const { q: search } = await loadNotesSearchParams(searchParams)
  const items = await notes.list({ q: search }, { userId: session.userId })
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Пока пусто</p>
  return (
    <ul className="flex flex-col gap-2">
      {items.map((note) => (
        <li key={note.id}>
          <Card>
            <CardHeader>
              <CardTitle>{note.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {formatDate(note.createdAt)}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
