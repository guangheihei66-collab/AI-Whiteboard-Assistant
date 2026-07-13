import { describe, expect, it } from 'vitest'
import type { RectangleElement } from '../types/canvas'
import {
  CANVAS_STORAGE_KEY,
  loadCanvasFromStorage,
  saveCanvasToStorage,
} from './storage'

const rectangle: RectangleElement = {
  id: 'rectangle-1',
  type: 'rectangle',
  x: 40,
  y: 60,
  width: 180,
  height: 90,
  color: '#2563eb',
  strokeWidth: 3,
  rotation: 15,
}

describe('canvas storage', () => {
  it('saves a versioned payload and restores every element property', () => {
    expect(saveCanvasToStorage([rectangle])).toBe(true)

    const serialized = localStorage.getItem(CANVAS_STORAGE_KEY)
    expect(serialized).not.toBeNull()
    expect(JSON.parse(serialized ?? '{}')).toEqual({ version: 3, elements: [rectangle] })

    expect(loadCanvasFromStorage()).toMatchObject({
      status: 'loaded',
      elements: [rectangle],
    })
  })

  it('returns a safe result for corrupted or invalid saved data', () => {
    localStorage.setItem(CANVAS_STORAGE_KEY, '{not-json')
    expect(loadCanvasFromStorage()).toMatchObject({ status: 'error', elements: [] })

    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({ version: 3, elements: [{}] }))
    expect(loadCanvasFromStorage()).toMatchObject({ status: 'invalid', elements: [] })
  })
})
