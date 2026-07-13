import { describe, expect, it } from 'vitest'
import type { CanvasElement, RectangleElement, TextElement } from '../types/canvas'
import {
  commitCanvasHistory,
  createCanvasHistory,
  MAX_HISTORY_ENTRIES,
  redoCanvasHistory,
  undoCanvasHistory,
} from './canvasHistory'

const rectangle: RectangleElement = {
  id: 'rectangle-1',
  type: 'rectangle',
  x: 10,
  y: 20,
  width: 100,
  height: 60,
  color: '#2563eb',
  strokeWidth: 2,
  rotation: 0,
}

const text: TextElement = {
  id: 'text-1',
  type: 'text',
  x: 30,
  y: 40,
  width: 120,
  text: 'AI proposal',
  color: '#111827',
  fontSize: 18,
  rotation: 0,
}

describe('canvas history', () => {
  it('restores a deleted element and can redo the deletion', () => {
    const deleted = commitCanvasHistory(createCanvasHistory([rectangle]), [])
    expect(undoCanvasHistory(deleted).present).toEqual([rectangle])
    expect(redoCanvasHistory(undoCanvasHistory(deleted)).present).toEqual([])
  })

  it('treats a batch of AI elements as one undo and redo step', () => {
    const batch: CanvasElement[] = [rectangle, text]
    const applied = commitCanvasHistory(createCanvasHistory(), batch)

    const undone = undoCanvasHistory(applied)
    expect(undone.present).toEqual([])
    expect(undone.future).toHaveLength(1)
    expect(redoCanvasHistory(undone).present).toEqual(batch)
  })

  it('clears redo after a new modification and caps retained history', () => {
    const undone = undoCanvasHistory(
      commitCanvasHistory(createCanvasHistory(), [rectangle]),
    )
    const replacement = commitCanvasHistory(undone, [text])
    expect(replacement.future).toEqual([])

    let history = createCanvasHistory()
    for (let index = 0; index < MAX_HISTORY_ENTRIES + 5; index += 1) {
      history = commitCanvasHistory(history, [
        { ...rectangle, id: `rectangle-${index}`, x: index },
      ])
    }
    expect(history.past).toHaveLength(MAX_HISTORY_ENTRIES)
  })
})
