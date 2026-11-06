'use server'

import { revalidatePath } from 'next/cache'
import { createNote } from '@/data/notes'
import { ActionError, authActionClient } from '@/lib/safe-action'
import { AddNoteInput } from './schema'

/** Пример Server Action: сессия (middleware authActionClient) → Zod → DAL → revalidate. Ошибки уходят в result, не исключениями. */
export const addNote = authActionClient
  .inputSchema(AddNoteInput)
  .action(async ({ parsedInput, ctx }) => {
    try {
      await createNote(parsedInput, ctx.session.userId)
    } catch {
      throw new ActionError('Не удалось сохранить заметку')
    }
    revalidatePath('/notes')
    return { ok: true as const }
  })
