import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('mobile layout stacks the workspace without horizontal overflow', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Whiteboard', { exact: true })).toBeVisible()
  await expect(page.getByTestId('whiteboard-canvas')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI Assistant' })).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)

  const canvasBox = await page.getByTestId('whiteboard-canvas').boundingBox()
  expect(canvasBox?.width).toBeGreaterThan(300)
  expect(canvasBox?.height).toBeGreaterThan(350)

  await page.getByRole('button', { name: 'Rectangle', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Rectangle', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
