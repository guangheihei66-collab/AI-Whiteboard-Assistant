import type { CanvasElement } from '../types/canvas'

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback)

const normalizeColor = (color: string) => {
  const trimmed = color.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 32) : '#0f172a'
}

const normalizeBase = (element: CanvasElement) => ({
  id: element.id.trim().slice(0, 100) || 'element',
  color: normalizeColor(element.color),
  rotation: clamp(finiteOr(element.rotation, 0), -360_000, 360_000),
})

/**
 * Keeps the browser request compatible with the backend schema without mutating
 * the formal canvas state. Legacy localStorage data should not make Analyze fail.
 */
export const normalizeCanvasElementsForAI = (elements: CanvasElement[]): CanvasElement[] =>
  elements.map((element) => {
    const base = normalizeBase(element)

    switch (element.type) {
      case 'line': {
        const finitePoints = element.points
          .filter((point) => Number.isFinite(point))
          .slice(0, 20_000)
        const points = finitePoints.length % 2 === 0 ? finitePoints : finitePoints.slice(0, -1)
        return {
          ...base,
          type: 'line',
          points: points.length >= 2 ? points : [0, 0],
          strokeWidth: clamp(finiteOr(element.strokeWidth, 1), 0.1, 100),
        }
      }
      case 'rectangle':
        return {
          ...base,
          type: 'rectangle',
          x: clamp(finiteOr(element.x, 0), -1_000_000, 1_000_000),
          y: clamp(finiteOr(element.y, 0), -1_000_000, 1_000_000),
          width: clamp(finiteOr(element.width, 0), 0, 1_000_000),
          height: clamp(finiteOr(element.height, 0), 0, 1_000_000),
          strokeWidth: clamp(finiteOr(element.strokeWidth, 1), 0.1, 100),
        }
      case 'circle':
        return {
          ...base,
          type: 'circle',
          x: clamp(finiteOr(element.x, 0), -1_000_000, 1_000_000),
          y: clamp(finiteOr(element.y, 0), -1_000_000, 1_000_000),
          radiusX: clamp(finiteOr(element.radiusX, 0), 0, 1_000_000),
          radiusY: clamp(finiteOr(element.radiusY, 0), 0, 1_000_000),
          strokeWidth: clamp(finiteOr(element.strokeWidth, 1), 0.1, 100),
        }
      case 'text': {
        const text = element.text.slice(0, 2_000)
        return {
          ...base,
          type: 'text',
          x: clamp(finiteOr(element.x, 0), -1_000_000, 1_000_000),
          y: clamp(finiteOr(element.y, 0), -1_000_000, 1_000_000),
          text,
          width: clamp(finiteOr(element.width, 40), 0, 1_000_000),
          fontSize: clamp(finiteOr(element.fontSize, 16), 1, 1_000),
        }
      }
    }
  })

