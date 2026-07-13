import { useEffect } from 'react'
import type { ToolType } from '../types/canvas'

interface KeyboardShortcutOptions {
  setCurrentTool: (tool: ToolType) => void
  deleteSelected: () => void
  undo: () => void
  redo: () => void
  clearSelection: () => void
  save: () => void
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.matches('input, textarea, select') ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]'))
  )
}

export function useKeyboardShortcuts({
  setCurrentTool,
  deleteSelected,
  undo,
  redo,
  clearSelection,
  save,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const modifier = event.ctrlKey || event.metaKey

      if (modifier && key === 's') {
        event.preventDefault()
        save()
        return
      }

      if (isEditableTarget(event.target)) return

      if (modifier && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }

      if (modifier && key === 'y') {
        event.preventDefault()
        redo()
        return
      }

      if (modifier || event.altKey) return

      const toolShortcuts: Partial<Record<string, ToolType>> = {
        v: 'select',
        p: 'pen',
        r: 'rectangle',
        c: 'circle',
        t: 'text',
        e: 'eraser',
      }
      const tool = toolShortcuts[key]
      if (tool) {
        event.preventDefault()
        setCurrentTool(tool)
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelected()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearSelection, deleteSelected, redo, save, setCurrentTool, undo])
}
