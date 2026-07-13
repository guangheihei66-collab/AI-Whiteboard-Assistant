import type { CanvasElement } from '../types/canvas'

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isBaseElement = (value: unknown): value is Record<string, unknown> =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).id === 'string' &&
      (value as Record<string, unknown>).id !== '' &&
      typeof (value as Record<string, unknown>).color === 'string' &&
      isFiniteNumber((value as Record<string, unknown>).rotation),
  )

export const isCanvasElement = (value: unknown): value is CanvasElement => {
  if (!isBaseElement(value)) return false

  switch (value.type) {
    case 'line':
      return (
        Array.isArray(value.points) &&
        value.points.length >= 2 &&
        value.points.length % 2 === 0 &&
        value.points.every(isFiniteNumber) &&
        isFiniteNumber(value.strokeWidth) &&
        value.strokeWidth > 0
      )
    case 'rectangle':
      return (
        isFiniteNumber(value.x) &&
        isFiniteNumber(value.y) &&
        isFiniteNumber(value.width) &&
        value.width >= 0 &&
        isFiniteNumber(value.height) &&
        value.height >= 0 &&
        isFiniteNumber(value.strokeWidth) &&
        value.strokeWidth > 0
      )
    case 'circle':
      return (
        isFiniteNumber(value.x) &&
        isFiniteNumber(value.y) &&
        isFiniteNumber(value.radiusX) &&
        value.radiusX >= 0 &&
        isFiniteNumber(value.radiusY) &&
        value.radiusY >= 0 &&
        isFiniteNumber(value.strokeWidth) &&
        value.strokeWidth > 0
      )
    case 'text':
      return (
        isFiniteNumber(value.x) &&
        isFiniteNumber(value.y) &&
        typeof value.text === 'string' &&
        value.text.length > 0 &&
        isFiniteNumber(value.width) &&
        value.width >= 10 &&
        isFiniteNumber(value.fontSize) &&
        value.fontSize >= 10
      )
    default:
      return false
  }
}

export const hasUniqueElementIds = (elements: CanvasElement[]) =>
  new Set(elements.map((element) => element.id)).size === elements.length
