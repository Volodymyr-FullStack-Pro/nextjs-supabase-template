import { expect, test } from '@playwright/test'

import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'

import {
  afterSignInUrl,
  createTestUser,
  deleteTestUser,
  enrollTotp,
  hasDatabase,
  NEEDS_DATABASE,
  signIn,
  submitLoginUntil,
  submitTotpCode,
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
    await expect(async () => {
      await submitTotpCode(page, secret)
      await expect(page).toHaveURL(afterSignInUrl, { timeout: STEP_TIMEOUT_MS })
    }).toPass()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Заметки')
  } finally {
    await deleteTestUser(user)
  }
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
