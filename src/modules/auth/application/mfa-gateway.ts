import type { TotpEnrollment } from '../domain/totp'

export type TotpOutcome = 'verified' | 'invalid-code' | 'too-many-attempts'

export interface MfaGateway {
  enrollTotp(): Promise<TotpEnrollment>
  verifiedTotpFactorId(): Promise<string | null>
  verifyTotp(input: { factorId: string; code: string }): Promise<TotpOutcome>
}
