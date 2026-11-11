import { randomUUID } from 'node:crypto'

import { expect, test } from '@playwright/test'

import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'

import { confirmTotpFactor } from './support/second-factor'
import {
  afterSignInUrl,
  confirmTotpUntil,
  createTestUser,
  deleteTestUser,
  enrollTotp,
  hasDatabase,
  NEEDS_DATABASE,
  signedInClient,
  signIn,
  storageStatePath,
  submitLoginUntil,
} from './support/users'

const MFA_REQUIRED_URL = 'http://localhost:3101'
const STEP_TIMEOUT_MS = 5000
const AAL2_REQUIRED = 'insufficient_aal'
const REFUSED_BY_AAL_OR_FACTOR_LIMIT = [AAL2_REQUIRED, 'too_many_enrolled_mfa_factors']

test.skip(!hasDatabase, NEEDS_DATABASE)

test('enrolls TOTP and asks for the code at the next sign-in', async ({ page }) => {
  const user = await createTestUser('totp')
  try {
    await signIn(page, user)
    const secret = await enrollTotp(page)

    await page.context().clearCookies()
    await submitLoginUntil(page, user, () =>
      expect(page).toHaveURL(/\/mfa\/verify$/u, { timeout: STEP_TIMEOUT_MS }),
    )
    await page.goto(AFTER_SIGN_IN_PATH)
    await expect(page).toHaveURL(/\/mfa\/verify$/u)
    await confirmTotpUntil(page, secret, afterSignInUrl)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  } finally {
    await deleteTestUser(user)
  }
})

test('a stolen password alone cannot remove, replace or add a factor directly at Supabase Auth', async () => {
  const user = await createTestUser('stolen-password')
  try {
    const owner = await signedInClient(user)
    const factorId = await confirmTotpFactor(owner)
    const thief = await signedInClient(user)
    const { data: level } = await thief.auth.mfa.getAuthenticatorAssuranceLevel()
    expect(level).toMatchObject({ currentLevel: 'aal1', nextLevel: 'aal2' })

    const refusals = {
      unenroll: await thief.auth.mfa.unenroll({ factorId }),
      password: await thief.auth.updateUser({ password: `${randomUUID()}-Bb2` }),
      email: await thief.auth.updateUser({ email: `thief-${randomUUID()}@example.com` }),
      enroll: await thief.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'thief' }),
    }
    const codes = Object.fromEntries(
      Object.entries(refusals).map(([attempt, { error }]) => [attempt, error?.code]),
    )
    expect(codes).toMatchObject({
      unenroll: AAL2_REQUIRED,
      password: AAL2_REQUIRED,
      email: AAL2_REQUIRED,
    })
    expect(REFUSED_BY_AAL_OR_FACTOR_LIMIT).toContain(codes['enroll'])
    const { error: sameCallAsTheApp } = await thief.auth.mfa.enroll({ factorType: 'totp' })
    expect(sameCallAsTheApp).not.toBeNull()

    const { data: factors } = await owner.auth.mfa.listFactors()
    expect(factors?.all.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: factorId, status: 'verified' },
    ])
    const { data: account } = await owner.auth.getUser()
    expect(account.user?.email).toBe(user.email)
    await expect(signedInClient(user)).resolves.toBeDefined()
  } finally {
    await deleteTestUser(user)
  }
})

test.describe('confirmed factor', () => {
  test.use({ storageState: storageStatePath('alice') })

  test('sends a user with a confirmed factor away from the setup screen', async ({ page }) => {
    await page.goto('/mfa/setup')
    await expect(page).toHaveURL(afterSignInUrl)
  })
})

test.describe('second factor required', () => {
  test.use({ baseURL: MFA_REQUIRED_URL })

  test('sends a user without a second factor to setup', async ({ page }) => {
    const user = await createTestUser('mfa-required')
    try {
      await submitLoginUntil(page, user, () =>
        expect(page).toHaveURL(/\/mfa\/setup$/u, { timeout: STEP_TIMEOUT_MS }),
      )
      await page.goto(AFTER_SIGN_IN_PATH)
      await expect(page).toHaveURL(/\/mfa\/setup$/u)
    } finally {
      await deleteTestUser(user)
    }
  })
})
