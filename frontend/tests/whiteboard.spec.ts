import { expect, test } from '@playwright/test'

test('whiteboard supports drawing and local canvas actions', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'AI Whiteboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI Assistant' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pen', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const canvasRegion = page.getByTestId('whiteboard-canvas')
  await expect(canvasRegion).toHaveAttribute('data-line-count', '0')

  const canvasBox = await canvasRegion.boundingBox()
  expect(canvasBox).not.toBeNull()
  if (!canvasBox) return

  await page.mouse.move(canvasBox.x + 80, canvasBox.y + 90)
  await page.mouse.down()
  await page.mouse.move(canvasBox.x + 150, canvasBox.y + 145, { steps: 8 })
  await page.mouse.move(canvasBox.x + 230, canvasBox.y + 110, { steps: 8 })
  await page.mouse.up()
  await expect(canvasRegion).toHaveAttribute('data-line-count', '1')

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('status')).toContainText('Saved 1 line locally.')

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(canvasRegion).toHaveAttribute('data-line-count', '0')

  await page.getByRole('button', { name: 'Load' }).click()
  await expect(canvasRegion).toHaveAttribute('data-line-count', '1')
  await expect(page.getByRole('status')).toContainText('Loaded 1 line.')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(canvasRegion).toHaveAttribute('data-line-count', '0')

  await page.getByRole('button', { name: 'Rectangle' }).click()
  await expect(page.getByRole('button', { name: 'Rectangle' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.screenshot({ path: 'test-results/whiteboard-live.png', fullPage: true })
})
