import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const COLOR_SCHEMES = ['light', 'dark'] as const
const TOUCH_TARGET_PX = 44
const CONTROLS =
  'button, input, select, textarea, summary, [role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"]'
const NARROWEST_SCREEN = { width: 320, height: 640 }
const DARK_CLASS = /\bdark\b/
const CSP_VIOLATION = /Content Security Policy/u
const LOG_SLICE = 200
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
]

type PageState = {
  state?: string
  ready?: (page: Page) => Promise<void>
}

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const contentCutOffByItsContainer = (page: Page) =>
  page.locator('body *').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const { overflowX, textOverflow } = getComputedStyle(element)
        const isCut = element.clientWidth > 1 && element.scrollWidth > element.clientWidth + 1
        return isCut && ['hidden', 'clip'].includes(overflowX) && textOverflow !== 'ellipsis'
      })
      .map((element) => element.outerHTML.slice(0, 80)),
  )

const CUT_OFF = 'содержимое обрезано контейнером'

export function checkPageQuality(path: string, { state, ready }: PageState = {}) {
  const name = state === undefined ? path : `${path} ${state}`
  const open = async (page: Page) => {
    const response = await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path}$`, 'u'))
    await ready?.(page)
    return response
  }

  for (const colorScheme of COLOR_SCHEMES) {
    test(`${name} meets WCAG 2.2 AA in the ${colorScheme} theme`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await open(page)
      const html = page.locator('html')
      await (colorScheme === 'dark'
        ? expect(html).toHaveClass(DARK_CLASS)
        : expect(html).not.toHaveClass(DARK_CLASS))
      const { violations, incomplete } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze()
      const unchecked = incomplete
        .filter(({ id }) => id === 'color-contrast')
        .flatMap(({ nodes }) => nodes.map(({ target }) => target.join(' ')))
      if (unchecked.length > 0) {
        testInfo.annotations.push({
          type: 'контраст не проверен axe (полупрозрачный фон): сверить с design-system.md',
          description: unchecked.join(', '),
        })
      }
      const summary = violations.map(
        ({ id, help, nodes }) => `${id}: ${help} (${String(nodes.length)})`,
      )
      expect(summary, 'нарушения доступности').toEqual([])
    })
  }

  test(`${name} is served with the exact Content Security Policy and breaks none of it`, async ({
    page,
  }) => {
    const violations: string[] = []
    page.on('console', (message) => {
      if (CSP_VIOLATION.test(message.text())) violations.push(message.text().slice(0, LOG_SLICE))
    })
    const response = await open(page)
    const policy = (response?.headers()['content-security-policy'] ?? '').split('; ')
    expect(policy, 'CSP отличается от согласованного: каждая директива сверяется целиком').toEqual(
      CONTENT_SECURITY_POLICY,
    )
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(violations, 'браузер заблокировал ресурс по CSP').toEqual([])
  })

  test(`${name} fits the screen without horizontal scroll or cut-off content`, async ({ page }) => {
    await open(page)
    expect(await horizontalOverflow(page), 'страница шире экрана').toBeLessThanOrEqual(0)
    expect(await contentCutOffByItsContainer(page), CUT_OFF).toEqual([])
  })

  test(`${name} reflows on a 320 px screen (WCAG 1.4.10)`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'ширина задаётся вручную, проверка одна на любом устройстве')
    await page.setViewportSize(NARROWEST_SCREEN)
    await open(page)
    expect(
      await horizontalOverflow(page),
      'на 320 px появляется горизонтальная прокрутка',
    ).toBeLessThanOrEqual(0)
    expect(await contentCutOffByItsContainer(page), CUT_OFF).toEqual([])
  })

  test(`${name} has touch targets of at least 44 px on a phone`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'размер касания проверяется на телефоне')
    await open(page)
    const small = await page.locator(CONTROLS).evaluateAll(
      (elements, minimum) =>
        elements
          .filter((element) => {
            const box = element.getBoundingClientRect()
            return box.width > 0 && (box.height < minimum || box.width < minimum)
          })
          .map((element) => element.outerHTML.slice(0, 80)),
      TOUCH_TARGET_PX,
    )
    expect(small, 'элементы меньше 44 px').toEqual([])
  })
}
