import { expect, type Page, test } from '@playwright/test'
import { generate } from 'otplib'

import {
  createTestUser,
  deleteTestUser,
  hasDatabase,
  NEEDS_DATABASE,
  signIn,
  submitLoginUntil,
} from './support/users'

const MFA_REQUIRED_URL = 'http://localhost:3101'
const STEP_TIMEOUT_MS = 5000

test.skip(!hasDatabase, NEEDS_DATABASE)

async function submitCode(page: Page, secret: string) {
  await page.getByLabel('Код из приложения').fill(await generate({ secret }))
  await page.getByRole('button', { name: 'Подтвердить' }).click()
}

test('enrolls TOTP and asks for the code at the next sign-in', async ({ page }) => {
  const user = await createTestUser('totp')
  try {
    await signIn(page, user)
    await page.goto('/mfa/setup')
    let secret = ''
    await expect(async () => {
      await page.getByRole('button', { name: 'Подключить приложение' }).click()
      secret =
        (await page.getByLabel('Секретный ключ').textContent({ timeout: STEP_TIMEOUT_MS })) ?? ''
      expect(secret).not.toBe('')
    }).toPass()
    await expect(
      page.getByRole('img', { name: 'QR-код для приложения-аутентификатора' }),
    ).toBeVisible()
    await submitCode(page, secret)
    await expect(page).toHaveURL(/\/notes$/u)

    await page.context().clearCookies()
    await submitLoginUntil(page, user, () =>
      expect(page).toHaveURL(/\/mfa\/verify$/u, { timeout: STEP_TIMEOUT_MS }),
    )
    await page.goto('/notes')
    await expect(page).toHaveURL(/\/mfa\/verify$/u)
    await expect(async () => {
      await submitCode(page, secret)
      await expect(page).toHaveURL(/\/notes$/u, { timeout: STEP_TIMEOUT_MS })
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
      await page.goto('/notes')
      await expect(page).toHaveURL(/\/mfa\/setup$/u)
    } finally {
      await deleteTestUser(user)
    }
  })
})
