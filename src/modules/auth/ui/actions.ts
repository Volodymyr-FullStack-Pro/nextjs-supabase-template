'use server'

import { redirect } from 'next/navigation'

import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'
import { actionClient, fail, mfaActionClient, setupActionClient } from '@/shared/lib/safe-action'
import { sessionMfaStep } from '@/shared/lib/session'

import { SignInInput } from '../domain/sign-in'
import { TotpCodeInput } from '../domain/totp'
import { auth } from '../server'

export const signIn = actionClient.inputSchema(SignInInput).action(async ({ parsedInput }) => {
  const result = await auth.signIn(parsedInput)
  if (!result.ok) fail(result.error)
  redirect(AFTER_SIGN_IN_PATH)
})

export const signOut = actionClient.action(async () => {
  await auth.signOut()
  redirect('/login')
})

export const startTotpSetup = setupActionClient.action(async () => auth.startTotpSetup())

export const verifyTotpCode = mfaActionClient
  .inputSchema(TotpCodeInput)
  .action(async ({ parsedInput, ctx }) => {
    const input =
      sessionMfaStep(ctx.session) === 'verify' ? { code: parsedInput.code } : parsedInput
    const result = await auth.verifyTotpCode(input)
    if (!result.ok) fail(result.error)
    redirect(AFTER_SIGN_IN_PATH)
  })
