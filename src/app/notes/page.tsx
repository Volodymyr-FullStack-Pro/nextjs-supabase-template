import { Suspense } from 'react'

import { NotesForm } from '@/modules/notes/ui/notes-form'
import { NotesList } from '@/modules/notes/ui/notes-list'
import { NotesSearch } from '@/modules/notes/ui/notes-search'
import { NotesTips } from '@/modules/notes/ui/notes-tips'

export default function NotesPage({ searchParams }: PageProps<'/notes'>) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Заметки</h1>
      <NotesTips />
      <NotesForm />
      <Suspense fallback={<div className="h-8" aria-hidden />}>
        <NotesSearch />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загружаю…</p>}>
        <NotesList searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
