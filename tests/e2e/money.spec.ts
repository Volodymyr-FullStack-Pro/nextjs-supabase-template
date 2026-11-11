import { expect, test } from '@playwright/test'

import {
  createTestUser,
  deleteTestUser,
  hasDatabase,
  insertNote,
  NEEDS_DATABASE,
  signedInClient,
  signIn,
  type TestUser,
} from './support/users'

const LARGE_AMOUNT = '1234567890123456.78'
const NBSP = ' '

test.skip(!hasDatabase, NEEDS_DATABASE)

let owner: TestUser

test.beforeEach(async () => {
  owner = await createTestUser('money')
  await insertNote(owner, { title: 'Крупная сумма', amount: LARGE_AMOUNT, currency: 'EUR' })
})

test.afterEach(async () => {
  await deleteTestUser(owner)
})

test('reads a 16-digit amount through supabase-js exactly only as text', async () => {
  const client = await signedInClient(owner)
  const asText = await client.from('notes').select('amount::text').single()
  const asNumber = await client.from('notes').select('amount').single()
  expect(asText.data?.amount).toBe(LARGE_AMOUNT)
  expect(String(asNumber.data?.amount)).not.toBe(LARGE_AMOUNT)
})

test('shows a 16-digit amount on the notes page without rounding', async ({ page }) => {
  await signIn(page, owner)
  await expect(
    page.getByText(`€1${NBSP}234${NBSP}567${NBSP}890${NBSP}123${NBSP}456,78`),
  ).toBeVisible()
})
