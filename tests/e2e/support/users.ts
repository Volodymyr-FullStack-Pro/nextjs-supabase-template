import { randomUUID } from 'node:crypto'

import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? ''
const secretKey = process.env['SUPABASE_SECRET_KEY'] ?? ''

export const hasDatabase = supabaseUrl !== '' && secretKey !== ''
export const NEEDS_DATABASE = 'нужен локальный Supabase: supabase start и npm run test:e2e:db'

export type TestUser = { id: string; email: string; password: string }
type Credentials = Pick<TestUser, 'email' | 'password'>
export type SignedInUser = 'alice' | 'bob'

export const storageStatePath = (user: SignedInUser) => `playwright/.auth/${user}.json`

function adminAuth() {
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.admin
}

export async function createTestUser(label: string): Promise<TestUser> {
  const email = `e2e-${label}-${randomUUID()}@example.com`
  const password = `${randomUUID()}-Aa1`
  const { data, error } = await adminAuth().createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createTestUser: ${error.message}`, { cause: error })
  return { id: data.user.id, email, password }
}

export async function deleteTestUser(user: TestUser): Promise<void> {
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
    expect(page).toHaveURL(/\/notes$/u, { timeout: LOGIN_ATTEMPT_TIMEOUT_MS }),
  )
}
