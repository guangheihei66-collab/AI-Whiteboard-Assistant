import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode, type ComponentProps } from 'react'
import { AIPanel } from './AIPanel'

const createProps = (
  overrides: Partial<ComponentProps<typeof AIPanel>> = {},
): ComponentProps<typeof AIPanel> => ({
  statusMessage: 'Canvas ready.',
  elements: [],
  canvasSize: { width: 1200, height: 800 },
  onPreviewElements: vi.fn(),
  onClearPreview: vi.fn(),
  onApplyPreview: vi.fn(),
  ...overrides,
})

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AIPanel', () => {
  it('shows loading and safely renders a successful analysis as text', async () => {
    let resolveRequest: ((response: Response) => void) | undefined
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve
    })
    vi.stubGlobal('fetch', vi.fn(() => request))
    const { container } = render(
      <StrictMode>
        <AIPanel {...createProps()} />
      </StrictMode>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Analyze Whiteboard' }))
    expect(screen.getByRole('button', { name: 'Analyzing...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel Request' })).toBeVisible()

    resolveRequest?.(
      jsonResponse({
        mode: 'mock',
        analysis: {
          summary: '<img src=x onerror=alert(1)>',
          elementCounts: { line: 0, rectangle: 0, circle: 0, text: 0 },
          observations: ['No elements.'],
          suggestions: ['Add an idea.'],
          nextActions: ['Draw one shape.'],
        },
      }),
    )

    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeVisible()
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows a friendly error when the API request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('network failed'))))
    render(<AIPanel {...createProps()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Analyze Whiteboard' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to reach the AI service',
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
  })

  it('previews a Mock proposal and cancels it without applying', async () => {
    const props = createProps()
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            mode: 'mock',
            proposal: {
              title: 'Login flow',
              description: 'A safe proposal.',
              elements: [
                {
                  id: 'rectangle-1',
                  type: 'rectangle',
                  x: 40,
                  y: 50,
                  width: 180,
                  height: 70,
                  rotation: 0,
                  color: '#2563eb',
                  strokeWidth: 2,
                },
              ],
            },
          }),
        ),
      ),
    )
    render(<AIPanel {...props} />)

    fireEvent.click(screen.getByRole('tab', { name: 'generate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Generate Whiteboard' }))

    expect(await screen.findByLabelText('AI generation proposal')).toBeVisible()
    expect(props.onPreviewElements).toHaveBeenCalledTimes(1)
    expect(props.onApplyPreview).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel Preview' }))
    await waitFor(() => expect(screen.queryByLabelText('AI generation proposal')).toBeNull())
    expect(props.onClearPreview).toHaveBeenCalledTimes(1)
    expect(props.onApplyPreview).not.toHaveBeenCalled()
  })
})
