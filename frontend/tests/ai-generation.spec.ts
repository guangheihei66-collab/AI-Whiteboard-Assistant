import { expect, test } from '@playwright/test'

const canvas = (page: import('@playwright/test').Page) => page.getByTestId('whiteboard-canvas')

const openGenerateMode = async (page: import('@playwright/test').Page) => {
  await page.getByRole('tab', { name: 'generate' }).click()
  await expect(page.getByLabel('Whiteboard generation request')).toBeVisible()
}

const generateMockProposal = async (page: import('@playwright/test').Page) => {
  await openGenerateMode(page)
  await page.getByLabel('Whiteboard generation request').fill('Create a user login flowchart')
  await page.getByRole('button', { name: 'Generate Whiteboard' }).click()
  await expect(page.getByRole('region', { name: 'AI generation proposal' })).toBeVisible()
}

test('mock generation previews without changing the canvas and Cancel discards it', async ({ page }) => {
  await page.goto('/')
  await generateMockProposal(page)

  const proposal = page.getByRole('region', { name: 'AI generation proposal' })
  await expect(proposal).toContainText('User Login Flow')
  await expect(proposal).toContainText('mock')
  await expect(canvas(page)).toHaveAttribute('data-element-count', '0')
  await expect(canvas(page)).toHaveAttribute('data-preview-count', '11')

  await page.getByRole('button', { name: 'Cancel Preview' }).click()
  await expect(proposal).toBeHidden()
  await expect(canvas(page)).toHaveAttribute('data-element-count', '0')
  await expect(canvas(page)).toHaveAttribute('data-preview-count', '0')
  await expect(
    page.getByText('Preview cancelled. The canvas was not changed.', { exact: true }),
  ).toBeVisible()
})

test('Apply adds one batch that Undo and Redo restore in one step', async ({ page }) => {
  await page.goto('/')
  await generateMockProposal(page)

  await page.getByRole('button', { name: 'Apply to Canvas' }).click()
  await expect(canvas(page)).toHaveAttribute('data-preview-count', '0')
  await expect(canvas(page)).toHaveAttribute('data-element-count', '11')
  await expect(canvas(page)).not.toHaveAttribute('data-selected-id', '')
  await expect(page.getByText('Proposal applied as one history step. Undo once to remove the full batch.')).toBeVisible()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(canvas(page)).toHaveAttribute('data-element-count', '0')

  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(canvas(page)).toHaveAttribute('data-element-count', '11')
})

test('Regenerate replaces only the preview and keeps formal elements unchanged', async ({ page }) => {
  await page.goto('/')
  await generateMockProposal(page)
  await expect(canvas(page)).toHaveAttribute('data-preview-count', '11')

  await page.getByRole('button', { name: 'Regenerate' }).click()
  await expect(page.getByRole('region', { name: 'AI generation proposal' })).toBeVisible()
  await expect(canvas(page)).toHaveAttribute('data-preview-count', '11')
  await expect(canvas(page)).toHaveAttribute('data-element-count', '0')
})

test('generation blocks empty and duplicate requests and supports cancellation', async ({ page }) => {
  let requestCount = 0
  await page.route('**/api/ai/generate', async (route) => {
    requestCount += 1
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    await route
      .fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'mock',
          proposal: {
            title: 'Delayed proposal',
            description: 'Delayed for cancellation testing.',
            elements: [
              {
                id: '00000000-0000-4000-8000-000000000001',
                type: 'rectangle',
                x: 40,
                y: 40,
                width: 120,
                height: 60,
                rotation: 0,
                color: '#2563eb',
                strokeWidth: 2,
              },
            ],
          },
        }),
      })
      .catch(() => undefined)
  })

  await page.goto('/')
  await openGenerateMode(page)
  const input = page.getByLabel('Whiteboard generation request')
  await input.fill('')
  await expect(page.getByRole('button', { name: 'Generate Whiteboard' })).toBeDisabled()

  await input.fill('Create a flowchart')
  await page.getByRole('button', { name: 'Generate Whiteboard' }).click()
  await expect(page.getByRole('button', { name: 'Generating...' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Cancel Request' })).toBeVisible()
  await expect.poll(() => requestCount).toBe(1)

  await page.getByRole('button', { name: 'Cancel Request' }).click()
  await expect(page.getByText('Generation cancelled.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate Whiteboard' })).toBeEnabled()
  expect(requestCount).toBe(1)
})

test('unsafe generated text is rejected and generation input does not trigger shortcuts', async ({ page }) => {
  await page.route('**/api/ai/generate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mode: 'live',
        proposal: {
          title: 'Unsafe proposal',
          description: 'Must be rejected.',
          elements: [
            {
              id: '00000000-0000-4000-8000-000000000002',
              type: 'text',
              x: 40,
              y: 40,
              width: 200,
              text: '<img src=x onerror=window.__unsafeExecuted=true>',
              fontSize: 18,
              rotation: 0,
              color: '#111827',
            },
          ],
        },
      }),
    }),
  )

  await page.goto('/')
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await openGenerateMode(page)
  const input = page.getByLabel('Whiteboard generation request')
  await input.focus()
  await page.keyboard.press('p')
  await page.keyboard.press('r')
  await page.keyboard.press('Delete')
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await input.fill('Create an unsafe proposal')
  await page.getByRole('button', { name: 'Generate Whiteboard' }).click()
  await expect(page.getByRole('alert')).toContainText('invalid whiteboard proposal')
  await expect(canvas(page)).toHaveAttribute('data-preview-count', '0')
  const executed = await page.evaluate(() => Boolean((window as Window & { __unsafeExecuted?: boolean }).__unsafeExecuted))
  expect(executed).toBe(false)
})
