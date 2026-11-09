import 'server-only'

import { createClient } from '@/shared/infrastructure/supabase/server'

import type { MfaGateway } from '../application/mfa-gateway'

const HTTP_TOO_MANY_REQUESTS = 429
const INVALID_CODE_ERRORS = new Set(['mfa_verification_failed', 'mfa_challenge_expired'])

export const supabaseMfaGateway: MfaGateway = {
  async enrollTotp() {
    const supabase = await createClient()
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
    if (listError) throw new Error(`mfa.listFactors: ${listError.message}`, { cause: listError })
    const unfinished = factors.all.filter(
      (factor) => factor.factor_type === 'totp' && factor.status !== 'verified',
    )
    await Promise.all(unfinished.map(({ id }) => supabase.auth.mfa.unenroll({ factorId: id })))
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) throw new Error(`mfa.enroll: ${error.message}`, { cause: error })
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
  },

  async verifiedTotpFactorId() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw new Error(`mfa.listFactors: ${error.message}`, { cause: error })
    return data.totp[0]?.id ?? null
  },

  async verifyTotp({ factorId, code }) {
    const supabase = await createClient()
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (!error) return 'verified'
    if (error.code !== undefined && INVALID_CODE_ERRORS.has(error.code)) return 'invalid-code'
    if (error.code === 'over_request_rate_limit' || error.status === HTTP_TOO_MANY_REQUESTS) {
      return 'too-many-attempts'
    }
    throw new Error(`mfa.verify: ${error.message}`, { cause: error })
  },
}
