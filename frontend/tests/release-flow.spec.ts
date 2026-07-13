import { expect, test } from '@playwright/test'

const storageKey = 'ai-whiteboard-assistant.canvas.v1'

test('release core flow persists edits and undoes one AI batch', async ({ page }) => {
  await page.goto('/')
  const canvas = page.getByTestId('whiteboard-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  const point = (x: number, y: number) => ({ x: box.x + x, y: box.y + y })

  await page.getByRole('button', { name: 'Rectangle', exact: true }).click()
  await page.mouse.move(point(100, 100).x, point(100, 100).y)
  await page.mouse.down()
  await page.mouse.move(point(240, 180).x, point(240, 180).y, { steps: 6 })
  await page.mouse.up()
  await expect(canvas).toHaveAttribute('data-rectangle-count', '1')

  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.mouse.move(point(100, 140).x, point(100, 140).y)
  await page.mouse.down()
  await page.mouse.move(point(150, 175).x, point(150, 175).y, { steps: 6 })
  await page.mouse.up()

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const movedX = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}').elements?.[0]?.x,
    storageKey,
  )
  expect(movedX).toBeGreaterThan(100)

  await page.getByTitle('Undo (Ctrl/Cmd+Z)').click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const originalX = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}').elements?.[0]?.x,
    storageKey,
  )
  expect(originalX).toBe(100)

  await page.getByTitle('Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)').click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.reload()
  await expect(canvas).toHaveAttribute('data-element-count', '1')

  await page.getByRole('tab', { name: 'generate' }).click()
  await page.getByRole('button', { name: 'Generate Whiteboard' }).click()
  await expect(canvas).toHaveAttribute('data-element-count', '1')
  await expect(canvas).toHaveAttribute('data-preview-count', '11')

  await page.getByRole('button', { name: 'Apply to Canvas' }).click()
  await expect(canvas).toHaveAttribute('data-element-count', '12')
  await page.getByTitle('Undo (Ctrl/Cmd+Z)').click()
  await expect(canvas).toHaveAttribute('data-element-count', '1')
})
