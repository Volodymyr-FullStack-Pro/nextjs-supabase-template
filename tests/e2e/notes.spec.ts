import { randomUUID } from 'node:crypto'

import { expect, type Page, test } from '@playwright/test'

import { hasDatabase, NEEDS_DATABASE, storageStatePath } from './support/users'

const SAVE_TIMEOUT_MS = 5000
const NBSP = ' '
const SERVER_ACTION_HEADER = 'next-action'

type NoteForm = { title: string; amount: string; currency?: string }

test.skip(!hasDatabase, NEEDS_DATABASE)
test.use({ storageState: storageStatePath('alice') })

async function openNotes(page: Page) {
  await page.goto('/notes')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Заметки')
  await expect(page.getByText('Загружаю…')).toBeHidden()
}

async function submitNote(page: Page, note: NoteForm) {
  await page.getByLabel('Новая заметка').fill(note.title)
  await page.getByLabel('Сумма').fill(note.amount)
  if (note.currency !== undefined) await page.getByLabel('Валюта').fill(note.currency)
  await page.getByRole('button', { name: 'Добавить' }).click()
}

async function loseFirstSaveResponse(page: Page) {
  let lost = false
  await page.route('**/notes', async (route) => {
    const request = route.request()
    const isSave = request.method() === 'POST' && SERVER_ACTION_HEADER in request.headers()
    if (lost || !isSave) {
      await route.fallback()
      return
    }
    lost = true
    await route.fetch()
    await route.abort('failed')
  })
}

const noteCards = (page: Page, title: string) => page.locator('li', { hasText: title })

test('shows a note only to its owner', async ({ page, browser }) => {
  const title = `Заметка ${randomUUID()}`
  await openNotes(page)
  await expect(async () => {
    await submitNote(page, { title, amount: '1 234,56' })
    await expect(page.getByText(title).first()).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  }).toPass()
  await expect(noteCards(page, title).getByText(`€1${NBSP}234,56`)).toBeVisible()

  const bobContext = await browser.newContext({ storageState: storageStatePath('bob') })
  try {
    const bobPage = await bobContext.newPage()
    await openNotes(bobPage)
    await expect(bobPage.getByText(title)).toHaveCount(0)
  } finally {
    await bobContext.close()
  }
})

test('saves one note when the response is lost and the form is submitted again', async ({
  page,
}) => {
  const title = `Повтор ${randomUUID()}`
  const notSaved = page.getByRole('alert').filter({ hasText: 'Что-то пошло не так' })
  await openNotes(page)
  await loseFirstSaveResponse(page)
  await expect(async () => {
    await submitNote(page, { title, amount: '10,50', currency: 'usd' })
    await expect(notSaved).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  }).toPass()

  const secondTab = await page.context().newPage()
  await openNotes(secondTab)
  await expect(noteCards(secondTab, title)).toHaveCount(1)
  await secondTab.close()

  await page.getByRole('button', { name: 'Добавить' }).click()
  await expect(noteCards(page, title).getByText('$10,50')).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  await expect(notSaved).toBeHidden()
  await page.reload()
  await expect(noteCards(page, title)).toHaveCount(1)
})

test('shows a rule violation from the server at the form', async ({ page }) => {
  const title = `Иены ${randomUUID()}`
  await openNotes(page)
  await expect(async () => {
    await submitNote(page, { title, amount: '100,50', currency: 'jpy' })
    await expect(
      page.getByRole('alert').filter({ hasText: 'У этой валюты нет копеек' }),
    ).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  }).toPass()
  await expect(noteCards(page, title)).toHaveCount(0)
})
