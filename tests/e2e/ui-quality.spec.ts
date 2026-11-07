import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PUBLIC_PAGES = ['/', '/login']
const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const COLOR_SCHEMES = ['light', 'dark'] as const

for (const path of PUBLIC_PAGES) {
  for (const colorScheme of COLOR_SCHEMES) {
    test(`${path} meets WCAG 2.2 AA in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.goto(path)
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze()
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
}
