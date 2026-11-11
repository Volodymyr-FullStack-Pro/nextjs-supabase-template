'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'

import type { NotFoundError } from '@/shared/domain/errors'
import type { Result } from '@/shared/domain/result'
import { authActionClient, fail } from '@/shared/lib/safe-action'

declare const sample: {
  close(id: string, ctx: { userId: string }): Promise<Result<string, NotFoundError>>
}

const CloseInput = z.object({ id: z.uuid() })

export const closeEntry = authActionClient
  .inputSchema(CloseInput)
  .action(async ({ parsedInput, ctx }) => {
    const result = await sample.close(parsedInput.id, { userId: ctx.session.userId })
    if (!result.ok) fail(result.error)
    refresh()
    return { id: result.value }
  })
