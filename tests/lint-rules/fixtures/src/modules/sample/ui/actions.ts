'use server'

import { z } from 'zod'

import type { NotFoundError } from '@/shared/domain/errors'
import type { Result } from '@/shared/domain/result'
import { actionClient, authActionClient, fail } from '@/shared/lib/safe-action' // expect: local/behind-sign-in
import * as session from '@/shared/lib/session' // expect: local/behind-sign-in

declare const sample: {
  close(id: string, ctx: { userId: string }): Promise<Result<string, NotFoundError>>
  move(id: string, to: { ownerId: string }): Promise<Result<string, NotFoundError>>
}

const CloseInput = z.object({ id: z.uuid(), ownerId: z.uuid() })

// expect: local/server-action
export async function closePlain(id: string, userId: string) {
  const result = await sample.close(id, { userId })
  return result.ok
}

export const closeByArrow = async (id: string) => sample.close(id, { userId: 'system' }) // expect: local/server-action

const closeQuietly = closeByArrow
export { closeQuietly } // expect: local/server-action
export default closeQuietly // expect: local/server-action

export const closeForOwner = authActionClient
  .inputSchema(CloseInput)
  .action(async ({ parsedInput }) => {
    const closed = await sample.close(parsedInput.id, { userId: parsedInput.ownerId }) // expect: local/server-action
    if (!closed.ok) fail(closed.error)
    const moved = await sample.move(parsedInput.id, { ownerId: parsedInput.ownerId }) // expect: local/server-action
    if (!moved.ok) fail(moved.error)
    return { id: moved.value }
  })

export const closeIgnoringResult = authActionClient
  .inputSchema(CloseInput)
  .action(async ({ parsedInput, ctx }) => {
    await sample.close(parsedInput.id, { userId: ctx.session.userId }) // expect: local/no-ignored-result
    return { closed: true }
  })

export const closeWithoutSession = actionClient.inputSchema(CloseInput).action(async () => {
  const current = await session.requireVerifiedSession()
  async function inner() {
    'use server' // expect: local/server-action
    return Promise.resolve(current.userId)
  }
  return inner()
})
