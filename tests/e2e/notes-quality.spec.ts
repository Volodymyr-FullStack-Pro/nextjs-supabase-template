import { expect, type Page, test } from '@playwright/test'

import { NOTE_TITLE_MAX } from '@/modules/notes/domain/note'

import { checkPageQuality } from './support/page-quality'
import {
  createTestUser,
  deleteTestUser,
  hasDatabase,
  insertNote,
  NEEDS_DATABASE,
  signIn,
  type TestUser,
} from './support/users'

const LARGE_AMOUNT = '1234567890123456.78'
const NBSP = ' '
const LARGE_AMOUNT_ON_SCREEN = `1${NBSP}234${NBSP}567${NBSP}890${NBSP}123${NBSP}456,78${NBSP}CHF`
const UNBROKEN_TITLE = 'Д'.repeat(NOTE_TITLE_MAX)
const NOTES = [
  { title: 'Крупная сумма', amount: LARGE_AMOUNT, currency: 'EUR' },
  { title: 'Крупная сумма с буквенным кодом валюты', amount: LARGE_AMOUNT, currency: 'CHF' },
  { title: UNBROKEN_TITLE, amount: '0.01', currency: 'EUR' },
]

test.skip(!hasDatabase, NEEDS_DATABASE)

let owner: TestUser

test.beforeEach(async ({ page }) => {
  owner = await createTestUser('notes-quality')
  await Promise.all(NOTES.map((note) => insertNote(owner, note)))
  await signIn(page, owner)
})

test.afterEach(async () => {
  await deleteTestUser(owner)
})

async function rowsAreOnScreen(page: Page) {
  await expect(page.getByText(LARGE_AMOUNT_ON_SCREEN)).toBeVisible()
  await expect(page.getByText(UNBROKEN_TITLE)).toBeVisible()
}

checkPageQuality('/notes', {
  state: 'with a 16-digit amount and a 200-character title',
  ready: rowsAreOnScreen,
})
