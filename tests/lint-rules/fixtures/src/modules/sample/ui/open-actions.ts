'use server'

import { createSafeActionClient } from 'next-safe-action' // expect: local/action-client
import { z } from 'zod'

const RemoveInput = z.object({ id: z.uuid(), ownerId: z.uuid() })

const openActionClient = createSafeActionClient()

// expect: local/server-action
export const removeAnything = openActionClient
  .inputSchema(RemoveInput)
  .action(async ({ parsedInput: { id, ownerId } }) => Promise.resolve({ id, ownerId }))

// expect: local/server-action
export const removeLazily = async (id: string) => {
  const safeAction = await import('next-safe-action') // expect: local/action-client
  return safeAction.createSafeActionClient().action(async () => Promise.resolve(id))
}
