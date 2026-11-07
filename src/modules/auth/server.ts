import 'server-only'

import { makeSignIn } from './application/sign-in'
import { supabaseAuthGateway } from './infrastructure/auth-gateway.supabase'

export const auth = {
  signIn: makeSignIn({ auth: supabaseAuthGateway }),
}
