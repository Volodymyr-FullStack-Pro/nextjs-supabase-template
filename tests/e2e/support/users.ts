import { randomUUID } from 'node:crypto'

import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { generate } from 'otplib'

import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const secretKey = process.env['SUPABASE_SECRET_KEY'] ?? ''
const publishableKey = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ?? ''

export const hasDatabase = supabaseUrl !== '' && secretKey !== ''
export const NEEDS_DATABASE = 'нужен локальный Supabase: supabase start и npm run test:e2e:db'

export type TestUser = { id: string; email: string; password: string }
type Credentials = Pick<TestUser, 'email' | 'password'>
export type SignedInUser = 'alice' | 'bob' | 'carol'

export const storageStatePath = (user: SignedInUser) => `playwright/.auth/${user}.json`
export const afterSignInUrl = new RegExp(`${AFTER_SIGN_IN_PATH}$`, 'u')

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false } }

function adminAuth() {
  return createClient(supabaseUrl, secretKey, NO_SESSION).auth.admin
}

export async function insertNote(
  owner: TestUser,
  note: { title: string; amount: string; currency: string },
): Promise<void> {
  const { error } = await createClient(supabaseUrl, secretKey, NO_SESSION).from('notes').insert({
    owner_id: owner.id,
    title: note.title,
    amount: note.amount,
    currency: note.currency,
    client_request_id: randomUUID(),
  })
  if (error) throw new Error(`insertNote: ${error.message}`, { cause: error })
}

export async function signedInClient(user: TestUser) {
  const client = createClient(supabaseUrl, publishableKey, NO_SESSION)
  const { error } = await client.auth.signInWithPassword(user)
  if (error) throw new Error(`signedInClient: ${error.message}`, { cause: error })
  return client
}

export async function createTestUser(label: string): Promise<TestUser> {
  const email = `e2e-${label}-${randomUUID()}@example.com`
  const password = `${randomUUID()}-Aa1`
  const { data, error } = await adminAuth().createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createTestUser: ${error.message}`, { cause: error })
  return { id: data.user.id, email, password }
}

export async function deleteTestUser(user: TestUser): Promise<void> {
  const { error: notesError } = await createClient(supabaseUrl, secretKey, NO_SESSION)
    .from('notes')
    .delete()
    .eq('owner_id', user.id)
  if (notesError) throw new Error(`deleteTestUser: ${notesError.message}`, { cause: notesError })
  const { error } = await adminAuth().deleteUser(user.id)
  if (error) throw new Error(`deleteTestUser: ${error.message}`, { cause: error })
}

const LOGIN_ATTEMPT_TIMEOUT_MS = 5000
const LOGIN_TIMEOUT_MS = 30_000

async function submitLogin(page: Page, credentials: Credentials): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Почта').fill(credentials.email)
  await page.getByLabel('Пароль').fill(credentials.password)
  await page.getByRole('button', { name: 'Войти' }).click()
}

export async function submitLoginUntil(
  page: Page,
  credentials: Credentials,
  outcome: () => Promise<void>,
): Promise<void> {
  await expect(async () => {
    await submitLogin(page, credentials)
    await outcome()
  }).toPass({ timeout: LOGIN_TIMEOUT_MS })
}

export async function signIn(page: Page, user: TestUser): Promise<void> {
  await submitLoginUntil(page, user, () =>
    expect(page).toHaveURL(afterSignInUrl, { timeout: LOGIN_ATTEMPT_TIMEOUT_MS }),
  )
}

const TOTP_STEP_TIMEOUT_MS = 5000

export async function submitTotpCode(page: Page, secret: string): Promise<void> {
  await page
    .getByLabel('Код из приложения')
    .fill(await generate({ secret }), { timeout: TOTP_STEP_TIMEOUT_MS })
  await page.getByRole('button', { name: 'Подтвердить' }).click({ timeout: TOTP_STEP_TIMEOUT_MS })
}

export async function confirmTotpUntil(page: Page, secret: string, url: RegExp): Promise<void> {
  await expect(async () => {
    if (!url.test(page.url())) await submitTotpCode(page, secret)
    await expect(page).toHaveURL(url, { timeout: TOTP_STEP_TIMEOUT_MS })
  }).toPass()
}

export async function enrollTotp(page: Page): Promise<string> {
  await page.goto('/mfa/setup')
  const secretLocator = page.getByLabel('Секретный ключ')
  await expect(async () => {
    if (!(await secretLocator.isVisible())) {
      await page
        .getByRole('button', { name: 'Подключить приложение' })
        .click({ timeout: TOTP_STEP_TIMEOUT_MS })
    }
    await expect(secretLocator).toBeVisible({ timeout: TOTP_STEP_TIMEOUT_MS })
  }).toPass()
  await expect(
    page.getByRole('img', { name: 'QR-код для приложения-аутентификатора' }),
  ).toBeVisible()
  const secret = (await secretLocator.textContent()) ?? ''
  expect(secret).not.toBe('')
  await confirmTotpUntil(page, secret, afterSignInUrl)
  return secret
}
