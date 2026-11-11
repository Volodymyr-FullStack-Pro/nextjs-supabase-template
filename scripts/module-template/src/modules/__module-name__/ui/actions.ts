'use server'

import { refresh } from 'next/cache'

import { authActionClient, fail } from '@/shared/lib/safe-action'

import { __ENTITY_NAME___MESSAGE_KEYS, Create__EntityName__Input } from '../domain/__entity-name__'
import { __moduleName__ } from '../server'

export const add__EntityName__ = authActionClient
  .inputSchema(Create__EntityName__Input)
  .action(async ({ parsedInput, ctx }) => {
    const result = await __moduleName__.create(parsedInput, { userId: ctx.session.userId })
    if (!result.ok) {
      if (result.error.rule === __ENTITY_NAME___MESSAGE_KEYS.requestReused) refresh()
      fail(result.error)
    }
    refresh()
    return { id: result.value.id }
  })
