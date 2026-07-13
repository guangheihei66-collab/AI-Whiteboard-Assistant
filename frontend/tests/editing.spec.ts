import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const storageKey = 'ai-whiteboard-assistant.canvas.v1'

const baseElements = [
  {
    id: 'rect-1',
    type: 'rectangle',
    x: 100,
    y: 120,
    width: 120,
    height: 80,
    color: '#ef4444',
    strokeWidth: 4,
    rotation: 0,
  },
  {
    id: 'circle-1',
    type: 'circle',
    x: 360,
    y: 280,
    radiusX: 50,
    radiusY: 50,
    color: '#2563eb',
    strokeWidth: 4,
    rotation: 0,
  },
  {
    id: 'text-1',
    type: 'text',
    x: 500,
    y: 120,
    text: 'Roadmap',
    width: 120,
    color: '#0f172a',
    fontSize: 24,
    rotation: 0,
  },
  {
    id: 'line-1',
    type: 'line',
    points: [80, 420, 210, 420],
    color: '#16a34a',
    strokeWidth: 5,
    rotation: 0,
  },
]

const seedCanvas = async (page: Page, elements = baseElements) => {
  await page.addInitScript(
    ({ key, seededElements }) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ version: 3, elements: seededElements }))
      }
    },
    { key: storageKey, seededElements: elements },
  )
}

const readStoredElements = async (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null').elements, storageKey)

test('Select supports move history, layers, deletion, and keyboard isolation', async ({ page }) => {
  await seedCanvas(page)
  await page.goto('/')
  const canvas = page.getByTestId('whiteboard-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const point = (x: number, y: number) => ({ x: box.x + x, y: box.y + y })

  await page.keyboard.press('v')
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toHaveAttribute('aria-pressed', 'true')

  const rectangleEdge = point(100, 160)
  await page.mouse.move(rectangleEdge.x, rectangleEdge.y)
  await page.mouse.down()
  await page.mouse.move(rectangleEdge.x + 60, rectangleEdge.y + 40, { steps: 8 })
  await page.mouse.up()
  await expect(canvas).toHaveAttribute('data-selected-id', 'rect-1')

  await page.waitForTimeout(600)
  let storedElements = await readStoredElements(page)
  expect(storedElements.find((element: { id: string }) => element.id === 'rect-1')).toMatchObject({
    x: 160,
    y: 160,
  })

  await page.keyboard.press('Control+z')
  await page.waitForTimeout(600)
  storedElements = await readStoredElements(page)
  expect(storedElements.find((element: { id: string }) => element.id === 'rect-1')).toMatchObject({
    x: 100,
    y: 120,
  })

  await page.keyboard.press('Control+Shift+z')
  await page.waitForTimeout(600)
  storedElements = await readStoredElements(page)
  expect(storedElements.find((element: { id: string }) => element.id === 'rect-1')).toMatchObject({
    x: 160,
    y: 160,
  })

  const movedRectangleEdge = point(160, 190)
  await page.mouse.click(movedRectangleEdge.x, movedRectangleEdge.y)
  await page.getByRole('button', { name: 'Bring Forward' }).click()
  await expect(canvas).toHaveAttribute('data-element-order', 'circle-1,rect-1,text-1,line-1')
  await page.keyboard.press('Control+z')
  await expect(canvas).toHaveAttribute('data-element-order', 'rect-1,circle-1,text-1,line-1')
  await page.keyboard.press('Control+y')
  await expect(canvas).toHaveAttribute('data-element-order', 'circle-1,rect-1,text-1,line-1')

  await page.mouse.click(movedRectangleEdge.x, movedRectangleEdge.y)
  await page.keyboard.press('Delete')
  await expect(canvas).toHaveAttribute('data-element-count', '3')
  await page.keyboard.press('Control+z')
  await expect(canvas).toHaveAttribute('data-element-count', '4')

  await page.keyboard.press('r')
  const newRectangleStart = point(650, 350)
  await page.mouse.move(newRectangleStart.x, newRectangleStart.y)
  await page.mouse.down()
  await page.mouse.move(newRectangleStart.x + 60, newRectangleStart.y + 50, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled()

  await page.keyboard.press('v')
  const circleEdge = point(360, 280)
  await page.mouse.move(circleEdge.x, circleEdge.y)
  await page.mouse.down()
  await page.mouse.move(circleEdge.x + 40, circleEdge.y + 30, { steps: 8 })
  await page.mouse.up()
  await expect(canvas).toHaveAttribute('data-selected-id', 'circle-1')
  await page.waitForTimeout(600)
  storedElements = await readStoredElements(page)
  expect(storedElements.find((element: { id: string }) => element.id === 'circle-1')).toMatchObject({
    x: 400,
    y: 310,
  })
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(600)
  storedElements = await readStoredElements(page)
  expect(storedElements.find((element: { id: string }) => element.id === 'circle-1')).toMatchObject({
    x: 360,
    y: 280,
  })
  await page.keyboard.press('Control+Shift+z')
  await page.waitForTimeout(600)
  storedElements = await readStoredElements(page)
  expect(storedElements.find((element: { id: string }) => element.id === 'circle-1')).toMatchObject({
    x: 400,
    y: 310,
  })

  const blank = point(740, 520)
  await page.mouse.click(blank.x, blank.y)
  await expect(canvas).toHaveAttribute('data-selected-id', '')
  const movedCircle = point(400, 310)
  await page.mouse.click(movedCircle.x, movedCircle.y)
  await page.keyboard.press('Escape')
  await expect(canvas).toHaveAttribute('data-selected-id', '')

  await page.mouse.click(movedCircle.x, movedCircle.y)
  const input = page.getByPlaceholder('Optional context for the board...')
  await input.focus()
  await page.keyboard.type('pr')
  await page.keyboard.press('Delete')
  await page.keyboard.press('Control+s')
  await expect(page.getByRole('status')).toContainText('Saved 5 elements locally.')
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(canvas).toHaveAttribute('data-element-count', '5')

  const lineBody = point(140, 420)
  await page.mouse.move(lineBody.x, lineBody.y)
  await page.mouse.down()
  await page.mouse.move(lineBody.x + 30, lineBody.y + 20, { steps: 6 })
  await page.mouse.up()
  await expect(canvas).toHaveAttribute('data-selected-id', 'line-1')
  await page.waitForTimeout(600)
  storedElements = await readStoredElements(page)
  expect(storedElements.find((element: { id: string }) => element.id === 'line-1').points).toEqual([
    110, 440, 240, 440,
  ])
  await page.keyboard.press('Backspace')
  await expect(canvas).toHaveAttribute('data-line-count', '0')
  await page.keyboard.press('Control+z')
  await expect(canvas).toHaveAttribute('data-line-count', '1')
})

test('Transformer persists rectangle scaling and text rotation through Save and Load', async ({
  page,
}) => {
  await seedCanvas(page)
  await page.goto('/')
  await page.keyboard.press('v')
  const canvas = page.getByTestId('whiteboard-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const point = (x: number, y: number) => ({ x: box.x + x, y: box.y + y })

  const rectangleEdge = point(100, 160)
  await page.mouse.click(rectangleEdge.x, rectangleEdge.y)
  const rectangleBottomRight = point(226, 206)
  await page.mouse.move(rectangleBottomRight.x, rectangleBottomRight.y)
  await page.mouse.down()
  await page.mouse.move(rectangleBottomRight.x + 55, rectangleBottomRight.y + 45, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(600)

  let storedElements = await readStoredElements(page)
  const scaledRectangle = storedElements.find((element: { id: string }) => element.id === 'rect-1')
  expect(scaledRectangle.width).toBeGreaterThan(150)
  expect(scaledRectangle.height).toBeGreaterThan(100)

  await page.reload()
  storedElements = await readStoredElements(page)
  expect(storedElements.find((element: { id: string }) => element.id === 'rect-1')).toMatchObject({
    width: scaledRectangle.width,
    height: scaledRectangle.height,
  })

  await page.keyboard.press('v')
  const textBody = point(505, 130)
  await page.mouse.click(textBody.x, textBody.y)
  await expect(canvas).toHaveAttribute('data-selected-id', 'text-1')
  const textRotateHandle = point(560, 99)
  await page.mouse.move(textRotateHandle.x, textRotateHandle.y)
  await page.mouse.down()
  const rotateTarget = point(640, 145)
  await page.mouse.move(rotateTarget.x, rotateTarget.y, { steps: 10 })
  await page.mouse.up()

  await page.getByRole('button', { name: 'Save' }).click()
  storedElements = await readStoredElements(page)
  const rotatedText = storedElements.find((element: { id: string }) => element.id === 'text-1')
  expect(Math.abs(rotatedText.rotation)).toBeGreaterThan(20)

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(canvas).toHaveAttribute('data-element-count', '0')
  await page.getByRole('button', { name: 'Load' }).click()
  await expect(canvas).toHaveAttribute('data-element-count', '4')
  await page.getByRole('button', { name: 'Save' }).click()
  storedElements = await readStoredElements(page)
  expect(storedElements.find((element: { id: string }) => element.id === 'text-1').rotation).toBe(
    rotatedText.rotation,
  )
})

test('corrupted storage is handled without crashing and Eraser still deletes elements', async ({
  page,
}) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{broken-json'), storageKey)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'AI Whiteboard' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('corrupted')
  await expect(page.getByTestId('whiteboard-canvas')).toHaveAttribute('data-element-count', '0')

  await page.evaluate(
    ({ key, elements }) =>
      localStorage.setItem(key, JSON.stringify({ version: 3, elements })),
    { key: storageKey, elements: baseElements },
  )
  await page.getByRole('button', { name: 'Load' }).click()
  const canvas = page.getByTestId('whiteboard-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  await page.keyboard.press('e')
  await page.mouse.click(box.x + 100, box.y + 160)
  await expect(canvas).toHaveAttribute('data-rectangle-count', '0')
  await page.keyboard.press('Control+z')
  await expect(canvas).toHaveAttribute('data-rectangle-count', '1')
})
