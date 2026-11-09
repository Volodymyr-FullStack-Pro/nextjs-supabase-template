import { z } from 'zod'

import { AUTH_MESSAGE_KEYS } from './message-keys'

export const SignInInput = z.object({
  email: z.email(AUTH_MESSAGE_KEYS.emailInvalid),
  password: z.string().min(1, AUTH_MESSAGE_KEYS.passwordRequired),
})
export type SignInInput = z.infer<typeof SignInInput>
