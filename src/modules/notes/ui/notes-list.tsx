import type { SearchParams } from 'nuqs/server'

import { formatMoney } from '@/shared/domain/money'
import { formatDate } from '@/shared/domain/time'
import { requireVerifiedSession } from '@/shared/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import { notes } from '../server'
import { loadNotesSearchParams } from './search-params'

export async function NotesList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireVerifiedSession()
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
            <CardContent className="flex justify-between gap-4 text-sm text-muted-foreground">
              <span>{formatDate(note.createdAt)}</span>
              <span className="text-foreground tabular-nums">
                {formatMoney(note.amount, { currency: note.currency })}
              </span>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
