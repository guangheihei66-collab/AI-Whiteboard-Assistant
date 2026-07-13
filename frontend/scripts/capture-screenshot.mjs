import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(
  scriptDirectory,
  '../../docs/images/ai-whiteboard-assistant.png',
)
const baseURL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:5173'
const storageKey = 'ai-whiteboard-assistant.canvas.v1'

const demoElements = [
  {
    id: 'frontend-box',
    type: 'rectangle',
    x: 80,
    y: 120,
    width: 190,
    height: 90,
    color: '#4f46e5',
    strokeWidth: 3,
    rotation: 0,
  },
  {
    id: 'frontend-label',
    type: 'text',
    x: 105,
    y: 150,
    width: 145,
    text: 'React + Konva',
    color: '#111827',
    fontSize: 22,
    rotation: 0,
  },
  {
    id: 'api-line',
    type: 'line',
    points: [270, 165, 360, 165],
    color: '#64748b',
    strokeWidth: 3,
    rotation: 0,
  },
  {
    id: 'backend-box',
    type: 'rectangle',
    x: 360,
    y: 120,
    width: 190,
    height: 90,
    color: '#7c3aed',
    strokeWidth: 3,
    rotation: 0,
  },
  {
    id: 'backend-label',
    type: 'text',
    x: 392,
    y: 150,
    width: 130,
    text: 'Express API',
    color: '#111827',
    fontSize: 22,
    rotation: 0,
  },
  {
    id: 'ai-line',
    type: 'line',
    points: [455, 210, 455, 285],
    color: '#64748b',
    strokeWidth: 3,
    rotation: 0,
  },
  {
    id: 'ai-circle',
    type: 'circle',
    x: 455,
    y: 350,
    radiusX: 105,
    radiusY: 65,
    color: '#059669',
    strokeWidth: 3,
    rotation: 0,
  },
  {
    id: 'ai-label',
    type: 'text',
    x: 392,
    y: 338,
    width: 130,
    text: 'Mock / Live AI',
    color: '#111827',
    fontSize: 20,
    rotation: 0,
  },
]

await mkdir(dirname(outputPath), { recursive: true })
const browser = await chromium.launch()

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.addInitScript(
    ({ key, elements }) => {
      localStorage.setItem(key, JSON.stringify({ version: 3, elements }))
    },
    { key: storageKey, elements: demoElements },
  )
  console.log(`Opening ${baseURL}`)
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('whiteboard-canvas').waitFor({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Analyze Whiteboard' }).click()
  await page.getByLabel('AI analysis').waitFor({ timeout: 10_000 })
  await page.screenshot({ path: outputPath, fullPage: false })
  console.log(`Screenshot written to ${outputPath}`)
} finally {
  await browser.close()
}
