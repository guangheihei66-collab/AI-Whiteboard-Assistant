import { expect, test } from '@playwright/test'

test('whiteboard supports shapes, persistence, erasing, and PNG export', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'AI Whiteboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI Assistant' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pen', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const canvasRegion = page.getByTestId('whiteboard-canvas')
  await expect(canvasRegion).toHaveAttribute('data-element-count', '0')
  const canvasBox = await canvasRegion.boundingBox()
  expect(canvasBox).not.toBeNull()
  if (!canvasBox) return

  const point = (x: number, y: number) => ({ x: canvasBox.x + x, y: canvasBox.y + y })
  const drag = async (startX: number, startY: number, endX: number, endY: number) => {
    const start = point(startX, startY)
    const end = point(endX, endY)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 10 })
    await page.mouse.up()
  }

  await drag(80, 90, 200, 90)
  await expect(canvasRegion).toHaveAttribute('data-line-count', '1')

  await page.getByLabel('Drawing color').fill('#ef4444')
  await page.getByLabel('Stroke width').fill('6')

  await page.getByRole('button', { name: 'Rectangle' }).click()
  await drag(280, 90, 380, 180)
  await expect(canvasRegion).toHaveAttribute('data-rectangle-count', '1')

  await page.getByRole('button', { name: 'Circle' }).click()
  await drag(500, 130, 550, 130)
  await expect(canvasRegion).toHaveAttribute('data-circle-count', '1')

  await page.getByRole('button', { name: 'Text', exact: true }).click()
  page.once('dialog', (dialog) => dialog.accept('Roadmap'))
  const textPosition = point(630, 110)
  await page.mouse.click(textPosition.x, textPosition.y)
  await expect(canvasRegion).toHaveAttribute('data-text-count', '1')
  await expect(canvasRegion).toHaveAttribute('data-element-count', '4')

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('status')).toContainText('Saved 4 elements locally.')
  const savedState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ai-whiteboard-assistant.canvas.v1') ?? 'null'),
  )
  expect(savedState.version).toBe(3)
  expect(savedState.elements.map((element: { type: string }) => element.type)).toEqual([
    'line',
    'rectangle',
    'circle',
    'text',
  ])
  expect(savedState.elements[1]).toMatchObject({ color: '#ef4444', strokeWidth: 6 })

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(canvasRegion).toHaveAttribute('data-element-count', '3')
  await page.getByRole('button', { name: 'Load' }).click()
  await expect(canvasRegion).toHaveAttribute('data-element-count', '4')
  await expect(page.getByRole('status')).toContainText('Loaded 4 elements.')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^ai-whiteboard-.*\.png$/)
  await expect(page.getByRole('status')).toContainText('PNG exported successfully.')

  await page.getByRole('button', { name: 'Eraser' }).click()
  const linePosition = point(140, 90)
  await page.mouse.click(linePosition.x, linePosition.y)
  await expect(canvasRegion).toHaveAttribute('data-line-count', '0')

  const rectanglePosition = point(330, 90)
  await page.mouse.click(rectanglePosition.x, rectanglePosition.y)
  await expect(canvasRegion).toHaveAttribute('data-rectangle-count', '0')

  const circlePosition = point(550, 130)
  await page.mouse.click(circlePosition.x, circlePosition.y)
  await expect(canvasRegion).toHaveAttribute('data-circle-count', '0')

  const eraseTextPosition = point(650, 120)
  await page.mouse.click(eraseTextPosition.x, eraseTextPosition.y)
  await expect(canvasRegion).toHaveAttribute('data-text-count', '0')
  await expect(canvasRegion).toHaveAttribute('data-element-count', '0')

  await page.getByRole('button', { name: 'Load' }).click()
  await expect(canvasRegion).toHaveAttribute('data-element-count', '4')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(canvasRegion).toHaveAttribute('data-element-count', '0')

  await page.evaluate(() => {
    localStorage.setItem(
      'ai-whiteboard-assistant.canvas.v1',
      JSON.stringify({
        version: 1,
        lines: [
          {
            id: 'legacy-line',
            tool: 'pen',
            points: [20, 20, 80, 80],
            stroke: '#2563eb',
            strokeWidth: 4,
          },
        ],
      }),
    )
  })
  await page.getByRole('button', { name: 'Load' }).click()
  await expect(canvasRegion).toHaveAttribute('data-line-count', '1')
  await expect(page.getByRole('status')).toContainText('Loaded and upgraded 1 legacy element.')

  await page.screenshot({ path: 'test-results/whiteboard-shapes-live.png', fullPage: true })
})
