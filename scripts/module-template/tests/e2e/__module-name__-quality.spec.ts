import { randomUUID } from 'node:crypto'

import { expect, type Page, test } from '@playwright/test'

import { __ENTITY_NAME___TITLE_MAX } from '@/modules/__module-name__/domain/__entity-name__'

import { checkPageQuality } from './support/page-quality'
import {
  createTestUser,
  deleteTestUser,
  hasDatabase,
  insertOwnedRows,
  NEEDS_DATABASE,
  signIn,
  type TestUser,
} from './support/users'

const LARGE_AMOUNT = '1234567890123456.78'
const NBSP = ' '
const LARGE_AMOUNT_ON_SCREEN = `1${NBSP}234${NBSP}567${NBSP}890${NBSP}123${NBSP}456,78${NBSP}CHF`
const UNBROKEN_TITLE = 'Д'.repeat(__ENTITY_NAME___TITLE_MAX)
const ROWS = [
  { title: 'Крупная сумма', amount: LARGE_AMOUNT, currency: 'EUR' },
  { title: 'Крупная сумма с буквенным кодом валюты', amount: LARGE_AMOUNT, currency: 'CHF' },
  { title: UNBROKEN_TITLE, amount: '0.01', currency: 'EUR' },
]

test.skip(!hasDatabase, NEEDS_DATABASE)

let owner: TestUser

test.beforeEach(async ({ page }) => {
  owner = await createTestUser('__module-name__-quality')
  await insertOwnedRows(
    '__module_name__',
    owner,
    ROWS.map((row) => ({ ...row, client_request_id: randomUUID() })),
  )
  await signIn(page, owner)
})

test.afterEach(async () => {
  await deleteTestUser(owner)
})

async function rowsAreOnScreen(page: Page) {
  await expect(page.getByText(LARGE_AMOUNT_ON_SCREEN)).toBeVisible()
  await expect(page.getByText(UNBROKEN_TITLE)).toBeVisible()
}

checkPageQuality('/__module-name__', {
  state: 'with a 16-digit amount and a title of the maximum length',
  ready: rowsAreOnScreen,
})
