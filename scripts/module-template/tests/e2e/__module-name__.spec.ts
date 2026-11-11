import { randomUUID } from 'node:crypto'

import { expect, type Page, test } from '@playwright/test'

import { hasDatabase, NEEDS_DATABASE, storageStatePath } from './support/users'

const PAGE_PATH = '/__module-name__'
const SAVE_TIMEOUT_MS = 5000
const NBSP = ' '
const SERVER_ACTION_HEADER = 'next-action'

type __EntityName__Form = { title: string; amount: string; currency?: string }

test.skip(!hasDatabase, NEEDS_DATABASE)
test.use({ storageState: storageStatePath('alice') })

async function open__ModuleName__(page: Page) {
  await page.goto(PAGE_PATH)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Загружаю список' })).toBeHidden()
}

async function submit__EntityName__(page: Page, __entityName__: __EntityName__Form) {
  await page.getByLabel('Название').fill(__entityName__.title)
  await page.getByLabel('Сумма').fill(__entityName__.amount)
  if (__entityName__.currency !== undefined) {
    await page.getByLabel('Валюта').fill(__entityName__.currency)
  }
  await page.getByRole('button', { name: 'Добавить' }).click()
}

async function loseFirstSaveResponse(page: Page) {
  let lost = false
  await page.route(`**${PAGE_PATH}`, async (route) => {
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

const cards = (page: Page, title: string) => page.locator('li', { hasText: title })

test('shows a record only to its owner', async ({ page, browser }) => {
  const title = `Запись ${randomUUID()}`
  await open__ModuleName__(page)
  await expect(async () => {
    await submit__EntityName__(page, { title, amount: '1 234,56' })
    await expect(page.getByText(title).first()).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  }).toPass()
  await expect(cards(page, title).getByText(`€1${NBSP}234,56`)).toBeVisible()

  const bobContext = await browser.newContext({ storageState: storageStatePath('bob') })
  try {
    const bobPage = await bobContext.newPage()
    await open__ModuleName__(bobPage)
    await expect(bobPage.getByText(title)).toHaveCount(0)
  } finally {
    await bobContext.close()
  }
})

test('saves one record when the response is lost and the form is submitted again', async ({
  page,
}) => {
  const title = `Повтор ${randomUUID()}`
  const notSaved = page.getByRole('alert').filter({ hasText: 'Что-то пошло не так' })
  await open__ModuleName__(page)
  await loseFirstSaveResponse(page)
  await expect(async () => {
    await submit__EntityName__(page, { title, amount: '10,50', currency: 'usd' })
    await expect(notSaved).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  }).toPass()

  const secondTab = await page.context().newPage()
  await open__ModuleName__(secondTab)
  await expect(cards(secondTab, title)).toHaveCount(1)
  await secondTab.close()

  await page.getByRole('button', { name: 'Добавить' }).click()
  await expect(cards(page, title).getByText('$10,50')).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  await expect(notSaved).toBeHidden()
  await page.reload()
  await expect(cards(page, title)).toHaveCount(1)
})

test('refuses a corrected amount sent with the request id of a lost response', async ({ page }) => {
  const title = `Правка ${randomUUID()}`
  const notSaved = page.getByRole('alert').filter({ hasText: 'Что-то пошло не так' })
  const savedWithOldData = page
    .getByRole('alert')
    .filter({ hasText: 'Запись уже сохранена с прежними данными' })
  await open__ModuleName__(page)
  await loseFirstSaveResponse(page)
  await expect(async () => {
    await submit__EntityName__(page, { title, amount: '1000' })
    await expect(notSaved).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  }).toPass()

  await page.getByLabel('Сумма').fill('10000')
  await page.getByRole('button', { name: 'Добавить' }).click()
  await expect(savedWithOldData).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  await expect(cards(page, title).getByText(`€1${NBSP}000,00`)).toBeVisible()

  const secondTab = await page.context().newPage()
  await open__ModuleName__(secondTab)
  await expect(cards(secondTab, title)).toHaveCount(1)
  await expect(cards(secondTab, title).getByText(`€1${NBSP}000,00`)).toBeVisible()
  await secondTab.close()

  await page.getByRole('button', { name: 'Добавить' }).click()
  await expect(cards(page, title).getByText(`€10${NBSP}000,00`)).toBeVisible({
    timeout: SAVE_TIMEOUT_MS,
  })
  await expect(savedWithOldData).toBeHidden()
  await page.reload()
  await expect(cards(page, title)).toHaveCount(2)
  await expect(cards(page, title).getByText(`€1${NBSP}000,00`)).toBeVisible()
})

test('shows a rule violation from the server at the form', async ({ page }) => {
  const title = `Иены ${randomUUID()}`
  await open__ModuleName__(page)
  await expect(async () => {
    await submit__EntityName__(page, { title, amount: '100,50', currency: 'jpy' })
    await expect(
      page.getByRole('alert').filter({ hasText: 'У этой валюты нет копеек' }),
    ).toBeVisible({ timeout: SAVE_TIMEOUT_MS })
  }).toPass()
  await expect(cards(page, title)).toHaveCount(0)
})
