import { expect, test } from '@playwright/test'

import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'

import {
  afterSignInUrl,
  confirmTotpUntil,
  createTestUser,
  deleteTestUser,
  enrollTotp,
  hasDatabase,
  NEEDS_DATABASE,
  signIn,
  storageStatePath,
  submitLoginUntil,
} from './support/users'

const MFA_REQUIRED_URL = 'http://localhost:3101'
const STEP_TIMEOUT_MS = 5000

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
