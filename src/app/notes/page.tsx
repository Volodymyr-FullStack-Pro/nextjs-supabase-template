import { listNotes } from '@/data/notes'
import { verifySession } from '@/data/session'
import { NotesForm } from '@/features/notes/notes-form'

/** Защищённая страница: сессия проверяется здесь и ещё раз в каждом Server Action. */
export default async function NotesPage() {
  await verifySession()
  const notes = await listNotes()
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Заметки</h1>
      <NotesForm />
      <ul className="flex flex-col gap-2">
        {notes.map((note) => (
          <li key={note.id} className="rounded-md border px-3 py-2">
            {note.title}
          </li>
        ))}
        {notes.length === 0 ? <li className="text-sm text-neutral-500">Пока пусто</li> : null}
      </ul>
    </main>
  )
}
