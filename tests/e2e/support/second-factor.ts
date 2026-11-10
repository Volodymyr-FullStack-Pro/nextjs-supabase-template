import type { SupabaseClient } from '@supabase/supabase-js'
import { generate } from 'otplib'

export async function confirmTotpFactor(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp' })
  if (error) throw new Error(`confirmTotpFactor: ${error.message}`, { cause: error })
  const code = await generate({ secret: data.totp.secret })
  const { error: verifyError } = await client.auth.mfa.challengeAndVerify({
    factorId: data.id,
    code,
  })
  if (verifyError) {
    throw new Error(`confirmTotpFactor: ${verifyError.message}`, { cause: verifyError })
  }
  return data.id
}
