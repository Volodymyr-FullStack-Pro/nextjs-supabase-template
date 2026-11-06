import { expect, test } from '@playwright/test'

test('home page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Шаблон работает')
})

test('login page opens without Supabase configured', async ({ page }) => {
  const response = await page.goto('/login')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
})
