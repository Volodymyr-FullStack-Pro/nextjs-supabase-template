import 'server-only'

import { makeSignIn } from './application/sign-in'
import { makeSignOut } from './application/sign-out'
import { makeStartTotpSetup } from './application/start-totp-setup'
import { makeVerifyTotpCode } from './application/verify-totp-code'
import { supabaseAuthGateway } from './infrastructure/auth-gateway.supabase'
import { supabaseMfaGateway } from './infrastructure/mfa-gateway.supabase'

export const auth = {
  signIn: makeSignIn({ auth: supabaseAuthGateway }),
  signOut: makeSignOut({ auth: supabaseAuthGateway }),
  startTotpSetup: makeStartTotpSetup({ mfa: supabaseMfaGateway }),
  verifyTotpCode: makeVerifyTotpCode({ mfa: supabaseMfaGateway }),
}
