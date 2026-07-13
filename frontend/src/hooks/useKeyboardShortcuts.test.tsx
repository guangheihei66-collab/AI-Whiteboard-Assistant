import { fireEvent, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

const createOptions = () => ({
  setCurrentTool: vi.fn(),
  deleteSelected: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  clearSelection: vi.fn(),
  save: vi.fn(),
})

describe('useKeyboardShortcuts', () => {
  it('does not change tools or delete while an input owns focus', () => {
    const options = createOptions()
    renderHook(() => useKeyboardShortcuts(options))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    fireEvent.keyDown(input, { key: 'p' })
    fireEvent.keyDown(input, { key: 'Delete' })

    expect(options.setCurrentTool).not.toHaveBeenCalled()
    expect(options.deleteSelected).not.toHaveBeenCalled()
    input.remove()
  })

  it('handles tool and history shortcuts outside editable controls', () => {
    const options = createOptions()
    renderHook(() => useKeyboardShortcuts(options))

    fireEvent.keyDown(window, { key: 'r' })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })

    expect(options.setCurrentTool).toHaveBeenCalledWith('rectangle')
    expect(options.undo).toHaveBeenCalledTimes(1)
    expect(options.redo).toHaveBeenCalledTimes(1)
  })
})
