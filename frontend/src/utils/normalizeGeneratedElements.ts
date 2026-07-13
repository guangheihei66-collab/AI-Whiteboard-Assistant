import type { CanvasDimensions, GenerationProposal } from '../types/ai'
import type { CanvasElement } from '../types/canvas'
import { hasUniqueElementIds, isCanvasElement } from './elementGuards'

const MAX_GENERATED_ELEMENTS = 40
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const UNSAFE_MARKUP = /<\/?[a-z][^>]*>|javascript\s*:/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSafeText = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= maximum &&
  !UNSAFE_MARKUP.test(value)

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const normalizeElement = (
  value: unknown,
  canvas: CanvasDimensions,
): CanvasElement | null => {
  if (!isCanvasElement(value) || !HEX_COLOR.test(value.color)) return null
  if (!Number.isFinite(value.rotation) || Math.abs(value.rotation) > 180) return null

  switch (value.type) {
    case 'line':
      if (value.points.length < 4 || value.points.length > 40) return null
      return {
        id: value.id,
        type: 'line',
        points: value.points.map((point, index) =>
          clamp(point, 0, index % 2 === 0 ? canvas.width : canvas.height),
        ),
        color: value.color,
        strokeWidth: clamp(value.strokeWidth, 1, 12),
        rotation: value.rotation,
      }
    case 'rectangle': {
      const width = clamp(value.width, 10, canvas.width)
      const height = clamp(value.height, 10, canvas.height)
      return {
        id: value.id,
        type: 'rectangle',
        x: clamp(value.x, 0, canvas.width - width),
        y: clamp(value.y, 0, canvas.height - height),
        width,
        height,
        color: value.color,
        strokeWidth: clamp(value.strokeWidth, 1, 12),
        rotation: value.rotation,
      }
    }
    case 'circle': {
      const radiusX = clamp(value.radiusX, 5, canvas.width / 2)
      const radiusY = clamp(value.radiusY, 5, canvas.height / 2)
      return {
        id: value.id,
        type: 'circle',
        x: clamp(value.x, radiusX, canvas.width - radiusX),
        y: clamp(value.y, radiusY, canvas.height - radiusY),
        radiusX,
        radiusY,
        color: value.color,
        strokeWidth: clamp(value.strokeWidth, 1, 12),
        rotation: value.rotation,
      }
    }
    case 'text': {
      if (!isSafeText(value.text, 160)) return null
      const width = clamp(value.width, 10, canvas.width)
      const fontSize = clamp(value.fontSize, 10, 48)
      return {
        id: value.id,
        type: 'text',
        x: clamp(value.x, 0, canvas.width - width),
        y: clamp(value.y, 0, Math.max(0, canvas.height - fontSize * 1.4)),
        width,
        text: value.text,
        fontSize,
        color: value.color,
        rotation: value.rotation,
      }
    }
  }
}

export const normalizeGeneratedProposal = (
  value: unknown,
  canvas: CanvasDimensions,
): GenerationProposal | null => {
  if (!isRecord(value)) return null
  if (!isSafeText(value.title, 100) || !isSafeText(value.description, 500)) return null
  if (
    !Array.isArray(value.elements) ||
    value.elements.length === 0 ||
    value.elements.length > MAX_GENERATED_ELEMENTS
  ) {
    return null
  }

  const elements = value.elements.map((element) => normalizeElement(element, canvas))
  if (elements.some((element) => element === null)) return null
  const validElements = elements as CanvasElement[]
  if (!hasUniqueElementIds(validElements)) return null

  return {
    title: value.title.trim(),
    description: value.description.trim(),
    elements: validElements,
  }
}
