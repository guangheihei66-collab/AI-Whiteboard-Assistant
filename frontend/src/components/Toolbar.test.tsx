import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { Toolbar } from './Toolbar'

const createProps = (
  overrides: Partial<ComponentProps<typeof Toolbar>> = {},
): ComponentProps<typeof Toolbar> => ({
  currentTool: 'pen',
  currentColor: '#0f172a',
  strokeWidth: 3,
  hasSelection: false,
  canUndo: false,
  canRedo: false,
  canBringForward: false,
  canSendBackward: false,
  onToolChange: vi.fn(),
  onColorChange: vi.fn(),
  onStrokeWidthChange: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onDeleteSelected: vi.fn(),
  onBringForward: vi.fn(),
  onSendBackward: vi.fn(),
  onClear: vi.fn(),
  onSave: vi.fn(),
  onLoad: vi.fn(),
  onExportPng: vi.fn(),
  ...overrides,
})

describe('Toolbar', () => {
  it('announces the active tool and changes tools through visible buttons', () => {
    const props = createProps()
    render(<Toolbar {...props} />)

    expect(screen.getByRole('button', { name: 'Pen' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Rectangle' }))
    expect(props.onToolChange).toHaveBeenCalledWith('rectangle')
  })

  it('exposes correct disabled states for history and selection actions', () => {
    const { rerender } = render(<Toolbar {...createProps()} />)

    expect(screen.getByTitle('Undo (Ctrl/Cmd+Z)')).toBeDisabled()
    expect(screen.getByTitle('Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)')).toBeDisabled()
    expect(screen.getByTitle('Delete selected (Delete / Backspace)')).toBeDisabled()

    rerender(
      <Toolbar
        {...createProps({
          canUndo: true,
          canRedo: true,
          hasSelection: true,
        })}
      />,
    )

    expect(screen.getByTitle('Undo (Ctrl/Cmd+Z)')).toBeEnabled()
    expect(screen.getByTitle('Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)')).toBeEnabled()
    expect(screen.getByTitle('Delete selected (Delete / Backspace)')).toBeEnabled()
  })
})
