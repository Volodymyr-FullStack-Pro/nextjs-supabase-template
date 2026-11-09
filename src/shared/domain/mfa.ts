export type AssuranceLevel = 'aal1' | 'aal2'
export type Assurance = { aal: AssuranceLevel; hasVerifiedFactor: boolean }
export type MfaStep = 'setup' | 'verify'

export const MFA_PATHS = { setup: '/mfa/setup', verify: '/mfa/verify' } as const satisfies Record<
  MfaStep,
  string
>

export function toAssuranceLevel(claim: string | undefined): AssuranceLevel {
  return claim === 'aal2' ? 'aal2' : 'aal1'
}

export function pendingMfaStep(assurance: Assurance, isMfaRequired: boolean): MfaStep | null {
  if (assurance.hasVerifiedFactor) return assurance.aal === 'aal2' ? null : 'verify'
  return isMfaRequired ? 'setup' : null
}
