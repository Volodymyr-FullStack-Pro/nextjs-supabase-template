'use server'

import { redirect } from 'next/navigation'
import { actionClient, fail } from '@/shared/lib/safe-action'
import { SignInInput } from '../domain/sign-in'
import { auth } from '../server'

/** Публичный action (без сессии), поэтому actionClient, а не authActionClient. */
export const signIn = actionClient.inputSchema(SignInInput).action(async ({ parsedInput }) => {
  const result = await auth.signIn(parsedInput)
  if (!result.ok) fail(result.error)
  redirect('/notes')
})
