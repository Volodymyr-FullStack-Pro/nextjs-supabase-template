import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PUBLIC_PAGES = ['/', '/login']
const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const COLOR_SCHEMES = ['light', 'dark'] as const
const TOUCH_TARGET_PX = 44
const CONTROLS =
  'button, input, select, textarea, summary, [role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"]'
const NARROWEST_SCREEN = { width: 320, height: 640 }
const DARK_CLASS = /\bdark\b/

for (const path of PUBLIC_PAGES) {
  for (const colorScheme of COLOR_SCHEMES) {
    test(`${path} meets WCAG 2.2 AA in the ${colorScheme} theme`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await page.goto(path)
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

  test(`${path} fits the screen without horizontal scroll`, async ({ page }) => {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, 'страница шире экрана').toBeLessThanOrEqual(0)
  })

  test(`${path} reflows on a 320 px screen (WCAG 1.4.10)`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'ширина задаётся вручную, проверка одна на любом устройстве')
    await page.setViewportSize(NARROWEST_SCREEN)
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, 'на 320 px появляется горизонтальная прокрутка').toBeLessThanOrEqual(0)
  })

  test(`${path} has touch targets of at least 44 px on a phone`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'размер касания проверяется на телефоне')
    await page.goto(path)
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
