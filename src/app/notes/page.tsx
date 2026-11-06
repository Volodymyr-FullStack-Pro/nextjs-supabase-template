import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listNotes } from '@/data/notes'
import { verifySession } from '@/data/session'
import { NotesForm } from '@/features/notes/notes-form'
import { NotesSearch } from '@/features/notes/notes-search'
import { loadNotesSearchParams } from '@/features/notes/search-params'

/** Защищённая страница: сессия проверяется здесь и ещё раз в каждом Server Action (authActionClient). */
export default async function NotesPage({ searchParams }: PageProps<'/notes'>) {
  await verifySession()
  const { q } = await loadNotesSearchParams(searchParams)
  const notes = await listNotes({ q })
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Заметки</h1>
      <NotesForm />
      <NotesSearch />
      <ul className="flex flex-col gap-2">
        {notes.map((note) => (
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
        {notes.length === 0 ? <li className="text-sm text-muted-foreground">Пока пусто</li> : null}
      </ul>
    </main>
  )
}
