export const AUTH_MESSAGE_KEYS = {
  emailInvalid: 'auth.email.invalid',
  passwordRequired: 'auth.password.required',
  totpCodeFormat: 'auth.totp.codeFormat',
} as const
export type AuthMessageKey = (typeof AUTH_MESSAGE_KEYS)[keyof typeof AUTH_MESSAGE_KEYS]
