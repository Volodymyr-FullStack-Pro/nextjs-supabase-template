import { describe, expect, it } from 'vitest'

import { pendingMfaStep, toAssuranceLevel } from '@/shared/domain/mfa'

describe('pendingMfaStep', () => {
  it('asks for the code when a verified factor exists but the session is aal1', () => {
    expect(pendingMfaStep({ aal: 'aal1', hasVerifiedFactor: true }, false)).toBe('verify')
  })

  it('lets an aal2 session through', () => {
    expect(pendingMfaStep({ aal: 'aal2', hasVerifiedFactor: true }, true)).toBeNull()
  })

  it('sends a user without a factor to setup when the second factor is required', () => {
    expect(pendingMfaStep({ aal: 'aal1', hasVerifiedFactor: false }, true)).toBe('setup')
  })

  it('lets a user without a factor through when the second factor is optional', () => {
    expect(pendingMfaStep({ aal: 'aal1', hasVerifiedFactor: false }, false)).toBeNull()
  })
})

describe('toAssuranceLevel', () => {
  it('reads aal2 from the token claim', () => {
    expect(toAssuranceLevel('aal2')).toBe('aal2')
  })

  it('treats a missing or unknown claim as aal1', () => {
    expect(toAssuranceLevel(undefined)).toBe('aal1')
    expect(toAssuranceLevel('aal3')).toBe('aal1')
  })
})
