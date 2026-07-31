import { describe, expect, it } from 'vitest'
import type { CanvasElement } from '../types/canvas'
import { normalizeCanvasElementsForAI } from './normalizeCanvasForAI'

describe('normalizeCanvasElementsForAI', () => {
  it('repairs legacy line data without mutating the canvas state', () => {
    const legacy = {
      id: 'line-1',
      type: 'line',
      points: [10, Number.NaN, 20],
      color: '',
      rotation: Number.POSITIVE_INFINITY,
      strokeWidth: Number.NaN,
    } as unknown as Extract<CanvasElement, { type: 'line' }>

    const normalized = normalizeCanvasElementsForAI([legacy])

    expect(normalized[0]).toMatchObject({
      type: 'line',
      points: [10, 20],
      color: '#0f172a',
      rotation: 0,
      strokeWidth: 1,
    })
    expect(legacy.points).toEqual([10, Number.NaN, 20])
  })

  it('keeps normal elements structurally compatible with the backend', () => {
    const elements: CanvasElement[] = [
      {
        id: 'text-1',
        type: 'text',
        x: 10,
        y: 20,
        text: 'Login',
        width: 80,
        fontSize: 18,
        color: '#2563eb',
        rotation: 0,
      },
    ]

    expect(normalizeCanvasElementsForAI(elements)).toEqual(elements)
  })
})
