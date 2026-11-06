'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createNote } from '@/data/notes'
import { verifySession } from '@/data/session'

export type ActionState = { ok?: true; error?: string }

const AddNoteInput = z.object({ title: z.string().trim().min(1, 'Введите заголовок').max(200) })

/** Пример Server Action: сессия → валидация → DAL → ошибки как значения. */
export async function addNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await verifySession()
  const parsed = AddNoteInput.safeParse({ title: formData.get('title') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Проверьте поля' }
  try {
    await createNote(parsed.data, session.userId)
  } catch {
    return { error: 'Не удалось сохранить заметку' }
  }
  revalidatePath('/notes')
  return { ok: true }
}
