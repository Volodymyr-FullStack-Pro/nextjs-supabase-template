import { redirect } from 'next/navigation'

import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'
import { verifySession } from '@/shared/lib/session'

import { TotpSetup } from './totp-setup'

export async function TotpSetupGuard() {
  const session = await verifySession()
  if (session.hasVerifiedFactor) redirect(AFTER_SIGN_IN_PATH)
  return <TotpSetup />
}
