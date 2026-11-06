import { readFileSync } from 'node:fs'
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

test('proxy is part of the production build', () => {
  // webServer собирает проект перед тестами. Next.js 16 записывает proxy (runtime nodejs) в
  // functions-config-manifest.json как "/_middleware"; без src/proxy.ts там пусто и редиректов нет.
  const manifest = JSON.parse(
    readFileSync('.next/server/functions-config-manifest.json', 'utf8'),
  ) as { functions: Record<string, { matchers: { originalSource: string }[] }> }
  const proxy = manifest.functions['/_middleware']
  expect(proxy, 'src/proxy.ts не попал в сборку').toBeDefined()
  expect(proxy?.matchers[0]?.originalSource).toContain('_next/static')
})
