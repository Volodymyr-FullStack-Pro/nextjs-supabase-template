'use server'

import { revalidatePath } from 'next/cache'

import { authActionClient, fail } from '@/shared/lib/safe-action'

import { CreateNoteInput } from '../domain/note'
import { notes } from '../server'

export const addNote = authActionClient
  .inputSchema(CreateNoteInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await notes.create(parsedInput, { userId: ctx.session.userId })
    if (!result.ok) fail(result.error)
    revalidatePath('/notes')
    return { id: result.value.id }
  })
