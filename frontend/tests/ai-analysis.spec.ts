import { expect, test } from '@playwright/test'

const mixedElements = [
  {
    id: 'line-1',
    type: 'line',
    points: [20, 20, 90, 90],
    color: '#0f172a',
    rotation: 0,
    strokeWidth: 3,
  },
  {
    id: 'rectangle-1',
    type: 'rectangle',
    x: 120,
    y: 60,
    width: 100,
    height: 80,
    color: '#ef4444',
    rotation: 0,
    strokeWidth: 4,
  },
  {
    id: 'circle-1',
    type: 'circle',
    x: 320,
    y: 120,
    radiusX: 45,
    radiusY: 35,
    color: '#2563eb',
    rotation: 0,
    strokeWidth: 4,
  },
  {
    id: 'text-1',
    type: 'text',
    x: 420,
    y: 80,
    text: 'Roadmap',
    width: 140,
    color: '#0f172a',
    rotation: 0,
    fontSize: 22,
  },
]

test('mock AI analyzes every element type with structured sections', async ({ page }) => {
  await page.goto('/')
  await page.evaluate((elements) => {
    localStorage.setItem(
      'ai-whiteboard-assistant.canvas.v1',
      JSON.stringify({ version: 3, elements }),
    )
  }, mixedElements)
  await page.reload()

  await page.getByLabel('Whiteboard analysis question').fill('Review my roadmap')
  await page.getByRole('button', { name: 'Analyze Whiteboard' }).click()

  const analysis = page.getByRole('region', { name: 'AI analysis' })
  await expect(analysis).toBeVisible()
  await expect(analysis).toContainText('mock mode')
  await expect(analysis).toContainText('The whiteboard contains 4 elements')
  await expect(analysis).toContainText('Summary')
  await expect(analysis).toContainText('Element Counts')
  await expect(analysis).toContainText('Observations')
  await expect(analysis).toContainText('Suggestions')
  await expect(analysis).toContainText('Next Actions')
  await expect(analysis).toContainText('line1')
  await expect(analysis).toContainText('rectangle1')
  await expect(analysis).toContainText('circle1')
  await expect(analysis).toContainText('text1')
})

test('empty whiteboard can be analyzed in mock mode', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('The whiteboard is empty, but AI features are still available.')).toBeVisible()
  await page.getByRole('button', { name: 'Analyze Whiteboard' }).click()

  const analysis = page.getByRole('region', { name: 'AI analysis' })
  await expect(analysis).toContainText('currently empty')
  await expect(analysis).toContainText('line0')
})

test('AI panel shows friendly backend, configuration, and response errors', async ({ page }) => {
  await page.route('**/api/ai/analyze', (route) => route.abort('connectionrefused'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Analyze Whiteboard' }).click()

  await expect(page.getByRole('alert')).toContainText('Unable to reach the AI service')
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()

  await page.unroute('**/api/ai/analyze')
  await page.route('**/api/ai/analyze', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'AI_NOT_CONFIGURED',
          message: 'Live AI is not configured. Check the backend environment variables.',
        },
      }),
    }),
  )
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByRole('alert')).toContainText('Check the backend environment variables')

  await page.unroute('**/api/ai/analyze')
  await page.route('**/api/ai/analyze', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"unexpected":true}' }),
  )
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByRole('alert')).toContainText('unexpected response')
})

test('AI request blocks duplicate submission and can be cancelled', async ({ page }) => {
  let requestCount = 0
  await page.route('**/api/ai/analyze', async (route) => {
    requestCount += 1
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    await route
      .fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'mock',
          analysis: {
            summary: 'Delayed result',
            elementCounts: { line: 0, rectangle: 0, circle: 0, text: 0 },
            observations: [],
            suggestions: [],
            nextActions: [],
          },
        }),
      })
      .catch(() => undefined)
  })

  await page.goto('/')
  const analyzeButton = page.getByRole('button', { name: 'Analyzing...' })
  await page.getByRole('button', { name: 'Analyze Whiteboard' }).click()
  await expect(analyzeButton).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Cancel Request' })).toBeVisible()
  expect(requestCount).toBe(1)

  await page.getByRole('button', { name: 'Cancel Request' }).click()
  await expect(page.getByText('Analysis cancelled.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analyze Whiteboard' })).toBeEnabled()
  expect(requestCount).toBe(1)
})
