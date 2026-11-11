const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403

export const API_DENIALS = {
  unauthorized: { status: HTTP_UNAUTHORIZED, body: { error: 'unauthorized' } },
  mfaRequired: { status: HTTP_FORBIDDEN, body: { error: 'mfa_required' } },
} as const

export type ApiDenial = (typeof API_DENIALS)[keyof typeof API_DENIALS]
