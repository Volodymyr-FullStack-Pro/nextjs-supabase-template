import { expect, test } from '@playwright/test'

import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'

import {
  createTestUser,
  deleteTestUser,
  hasDatabase,
  NEEDS_DATABASE,
  signIn,
  submitLoginUntil,
} from './support/users'

const TOAST_TIMEOUT_MS = 5000

test.skip(!hasDatabase, NEEDS_DATABASE)

test('sends a signed-out visitor from a protected page to the login page', async ({ page }) => {
  await page.goto(AFTER_SIGN_IN_PATH)
  await expect(page).toHaveURL(/\/login$/u)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Вход')
})

test('signs in with email and password', async ({ page }) => {
  const user = await createTestUser('login')
  try {
    await signIn(page, user)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  } finally {
    await deleteTestUser(user)
  }
})

test('rejects a wrong password', async ({ page }) => {
  const user = await createTestUser('wrong-password')
  try {
    await submitLoginUntil(page, { email: user.email, password: `${user.password}-wrong` }, () =>
      expect(page.getByText('Неверная почта или пароль')).toBeVisible({
        timeout: TOAST_TIMEOUT_MS,
      }),
    )
    await expect(page).toHaveURL(/\/login$/u)
  } finally {
    await deleteTestUser(user)
  }
})
