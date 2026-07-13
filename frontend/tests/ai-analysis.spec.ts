import { expect, test } from '@playwright/test'

const mixedElements = [
  {
    id: 'line-1',
    type: 'line',
    points: [20, 20, 90, 90],
    color: '#0f172a',
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
    strokeWidth: 4,
  },
  {
    id: 'circle-1',
    type: 'circle',
    x: 320,
    y: 120,
    radius: 45,
    color: '#2563eb',
    strokeWidth: 4,
  },
  {
    id: 'text-1',
    type: 'text',
    x: 420,
    y: 80,
    text: 'Roadmap',
    color: '#0f172a',
    fontSize: 22,
  },
]

test('mock AI analyzes every whiteboard element type', async ({ page }) => {
  await page.goto('/')
  await page.evaluate((elements) => {
    localStorage.setItem(
      'ai-whiteboard-assistant.canvas.v1',
      JSON.stringify({ version: 2, elements }),
    )
  }, mixedElements)

  await page.getByRole('button', { name: 'Load' }).click()
  await page.getByPlaceholder('Optional context for the board...').fill('Review my roadmap')
  await page.getByRole('button', { name: 'Analyze Whiteboard' }).click()

  const analysis = page.getByRole('region', { name: 'Mock analysis' })
  await expect(analysis).toBeVisible()
  await expect(analysis).toContainText('The whiteboard contains 4 elements.')
  await expect(analysis).toContainText('line1')
  await expect(analysis).toContainText('rectangle1')
  await expect(analysis).toContainText('circle1')
  await expect(analysis).toContainText('text1')
})

test('AI panel shows a friendly message when the backend is unavailable', async ({ page }) => {
  await page.route('**/api/ai/analyze', (route) => route.abort('connectionrefused'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Analyze Whiteboard' }).click()

  await expect(page.getByRole('alert')).toContainText('Unable to reach the mock AI service')
})
