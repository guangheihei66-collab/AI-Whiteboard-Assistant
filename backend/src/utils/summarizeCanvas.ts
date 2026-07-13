import type { CanvasElement } from '../schemas/ai.js'
import type { ElementCounts, ElementType } from '../types/ai.js'

const round = (value: number) => Math.round(value * 10) / 10

export const createEmptyCounts = (): ElementCounts => ({
  line: 0,
  rectangle: 0,
  circle: 0,
  text: 0,
})

export const countElements = (elements: CanvasElement[]): ElementCounts => {
  const counts = createEmptyCounts()
  for (const element of elements) counts[element.type] += 1
  return counts
}

const summarizeLine = (element: Extract<CanvasElement, { type: 'line' }>, layer: number) => {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let approximateLength = 0

  for (let index = 0; index < element.points.length; index += 2) {
    const x = element.points[index] ?? 0
    const y = element.points[index + 1] ?? 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)

    if (index >= 2) {
      const previousX = element.points[index - 2] ?? x
      const previousY = element.points[index - 1] ?? y
      approximateLength += Math.hypot(x - previousX, y - previousY)
    }
  }

  return {
    type: element.type,
    layer,
    color: element.color,
    strokeWidth: round(element.strokeWidth),
    pointCount: element.points.length / 2,
    bounds: {
      x: round(minX),
      y: round(minY),
      width: round(maxX - minX),
      height: round(maxY - minY),
    },
    approximateLength: round(approximateLength),
    rotation: round(element.rotation),
  }
}

const summarizeElement = (element: CanvasElement, layer: number) => {
  switch (element.type) {
    case 'line':
      return summarizeLine(element, layer)
    case 'rectangle':
      return {
        type: element.type,
        layer,
        color: element.color,
        x: round(element.x),
        y: round(element.y),
        width: round(element.width),
        height: round(element.height),
        strokeWidth: round(element.strokeWidth),
        rotation: round(element.rotation),
      }
    case 'circle':
      return {
        type: element.type,
        layer,
        color: element.color,
        x: round(element.x),
        y: round(element.y),
        radiusX: round(element.radiusX),
        radiusY: round(element.radiusY),
        strokeWidth: round(element.strokeWidth),
        rotation: round(element.rotation),
      }
    case 'text':
      return {
        type: element.type,
        layer,
        color: element.color,
        x: round(element.x),
        y: round(element.y),
        width: round(element.width),
        fontSize: round(element.fontSize),
        rotation: round(element.rotation),
        text: element.text.slice(0, 300),
        textTruncated: element.text.length > 300,
      }
  }
}

export interface CanvasSummary {
  totalElements: number
  elementCounts: ElementCounts
  elements: ReturnType<typeof summarizeElement>[]
}

export const summarizeCanvas = (elements: CanvasElement[]): CanvasSummary => ({
  totalElements: elements.length,
  elementCounts: countElements(elements),
  elements: elements.map((element, index) => summarizeElement(element, index)),
})

export const formatCounts = (counts: ElementCounts) =>
  (Object.entries(counts) as [ElementType, number][])
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${type}${count === 1 ? '' : 's'}`)
    .join(', ')
