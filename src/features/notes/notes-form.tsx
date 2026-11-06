'use client'

import { useActionState } from 'react'
import { addNote, type ActionState } from './action'

const initial: ActionState = {}

export function NotesForm() {
  const [state, formAction, pending] = useActionState(addNote, initial)
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="title">
        Новая заметка
      </label>
      <input
        id="title"
        name="title"
        required
        maxLength={200}
        className="rounded-md border px-3 py-2"
        placeholder="Заголовок"
      />
      <button type="submit" disabled={pending} className="rounded-md bg-black px-3 py-2 text-white">
        {pending ? 'Сохраняю…' : 'Добавить'}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm text-green-700">Сохранено</p> : null}
    </form>
  )
}
