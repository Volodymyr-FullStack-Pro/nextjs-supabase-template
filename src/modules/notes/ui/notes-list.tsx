import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { SearchParams } from 'nuqs/server'
import { verifySession } from '@/shared/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { notes } from '../server'
import { loadNotesSearchParams } from './search-params'

/** Динамическая часть страницы: читает сессию и базу, поэтому страница оборачивает её в Suspense (Cache Components). */
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
              {format(new Date(note.createdAt), 'd MMMM yyyy', { locale: ru })}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
