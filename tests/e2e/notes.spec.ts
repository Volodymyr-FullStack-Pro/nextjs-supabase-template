import { randomUUID } from 'node:crypto'

import { expect, type Page, test } from '@playwright/test'

import { hasDatabase, NEEDS_DATABASE, storageStatePath } from './support/users'

const SAVE_TIMEOUT_MS = 5000
const NBSP = ' '

test.skip(!hasDatabase, NEEDS_DATABASE)
test.use({ storageState: storageStatePath('alice') })

async function openNotes(page: Page) {
  await page.goto('/notes')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Заметки')
  await expect(page.getByText('Загружаю…')).toBeHidden()
}

test('shows a note only to its owner', async ({ page, browser }) => {
  const title = `Заметка ${randomUUID()}`
  await openNotes(page)
  await expect(async () => {
    await page.getByLabel('Новая заметка').fill(title)
    await page.getByLabel('Сумма').fill('1 234,56')
    await page.getByRole('button', { name: 'Добавить' }).click()
    await expect(page.getByText(title).first()).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  }).toPass()
  await expect(page.locator('li', { hasText: title }).getByText(`€1${NBSP}234,56`)).toBeVisible()

  const bobContext = await browser.newContext({ storageState: storageStatePath('bob') })
  try {
    const bobPage = await bobContext.newPage()
    await openNotes(bobPage)
    await expect(bobPage.getByText(title)).toHaveCount(0)
  } finally {
    await bobContext.close()
  }
})
