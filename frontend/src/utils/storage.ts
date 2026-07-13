import type {
  CanvasElement,
  CanvasState,
  CircleElement,
  LineElement,
  RectangleElement,
  TextElement,
} from '../types/canvas'
import { hasUniqueElementIds, isCanvasElement, isFiniteNumber } from './elementGuards'

export const CANVAS_STORAGE_KEY = 'ai-whiteboard-assistant.canvas.v1'

export interface CanvasLoadResult {
  elements: CanvasElement[]
  status: 'missing' | 'loaded' | 'migrated' | 'invalid' | 'error'
  message: string
}

interface LegacyLine {
  id: string
  tool: 'pen'
  points: number[]
  stroke: string
  strokeWidth: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object')

const estimateTextWidth = (text: string, fontSize: number) =>
  Math.max(40, Math.ceil(text.length * fontSize * 0.62))

const makeIdsUnique = (elements: CanvasElement[]) => {
  const seen = new Set<string>()
  return elements.map((element, index) => {
    if (!seen.has(element.id)) {
      seen.add(element.id)
      return element
    }

    const id = `${element.id}-migrated-${index}`
    seen.add(id)
    return { ...element, id }
  })
}

const isLegacyLine = (value: unknown): value is LegacyLine => {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.tool === 'pen' &&
    Array.isArray(value.points) &&
    value.points.length >= 2 &&
    value.points.length % 2 === 0 &&
    value.points.every(isFiniteNumber) &&
    typeof value.stroke === 'string' &&
    isFiniteNumber(value.strokeWidth) &&
    value.strokeWidth > 0
  )
}

const migrateVersionOne = (value: Record<string, unknown>): CanvasElement[] | null => {
  if (value.version !== 1 || !Array.isArray(value.lines) || !value.lines.every(isLegacyLine)) {
    return null
  }

  return makeIdsUnique(
    value.lines.map<LineElement>((line) => ({
      id: line.id,
      type: 'line',
      points: line.points,
      color: line.stroke,
      strokeWidth: line.strokeWidth,
      rotation: 0,
    })),
  )
}

const migrateVersionTwoElement = (value: unknown): CanvasElement | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.color !== 'string') {
    return null
  }

  if (
    value.type === 'line' &&
    Array.isArray(value.points) &&
    value.points.length >= 2 &&
    value.points.length % 2 === 0 &&
    value.points.every(isFiniteNumber) &&
    isFiniteNumber(value.strokeWidth) &&
    value.strokeWidth > 0
  ) {
    return {
      id: value.id,
      type: 'line',
      points: value.points,
      color: value.color,
      strokeWidth: value.strokeWidth,
      rotation: 0,
    }
  }

  if (
    value.type === 'rectangle' &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    isFiniteNumber(value.strokeWidth)
  ) {
    return {
      id: value.id,
      type: 'rectangle',
      x: value.x,
      y: value.y,
      width: Math.max(0, value.width),
      height: Math.max(0, value.height),
      color: value.color,
      strokeWidth: Math.max(1, value.strokeWidth),
      rotation: 0,
    } satisfies RectangleElement
  }

  if (
    value.type === 'circle' &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.radius) &&
    isFiniteNumber(value.strokeWidth)
  ) {
    return {
      id: value.id,
      type: 'circle',
      x: value.x,
      y: value.y,
      radiusX: Math.max(0, value.radius),
      radiusY: Math.max(0, value.radius),
      color: value.color,
      strokeWidth: Math.max(1, value.strokeWidth),
      rotation: 0,
    } satisfies CircleElement
  }

  if (
    value.type === 'text' &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    typeof value.text === 'string' &&
    value.text.length > 0 &&
    isFiniteNumber(value.fontSize)
  ) {
    const fontSize = Math.max(10, value.fontSize)
    return {
      id: value.id,
      type: 'text',
      x: value.x,
      y: value.y,
      text: value.text,
      width: estimateTextWidth(value.text, fontSize),
      color: value.color,
      fontSize,
      rotation: 0,
    } satisfies TextElement
  }

  return null
}

const migrateVersionTwo = (value: Record<string, unknown>): CanvasElement[] | null => {
  if (value.version !== 2 || !Array.isArray(value.elements)) return null
  const elements = value.elements.map(migrateVersionTwoElement)
  if (elements.some((element) => element === null)) return null
  return makeIdsUnique(elements as CanvasElement[])
}

const parseVersionThree = (value: Record<string, unknown>): CanvasElement[] | null => {
  if (value.version !== 3 || !Array.isArray(value.elements)) return null
  if (!value.elements.every(isCanvasElement)) return null
  const elements = value.elements as CanvasElement[]
  return hasUniqueElementIds(elements) ? elements : null
}

export const loadCanvasFromStorage = (): CanvasLoadResult => {
  try {
    const serialized = localStorage.getItem(CANVAS_STORAGE_KEY)
    if (!serialized) {
      return { elements: [], status: 'missing', message: 'No saved canvas was found.' }
    }

    const parsed: unknown = JSON.parse(serialized)
    if (!isRecord(parsed)) {
      return { elements: [], status: 'invalid', message: 'Saved canvas data is invalid.' }
    }

    const currentElements = parseVersionThree(parsed)
    if (currentElements) {
      return {
        elements: currentElements,
        status: 'loaded',
        message: `Loaded ${currentElements.length} element${currentElements.length === 1 ? '' : 's'}.`,
      }
    }

    const migratedElements = migrateVersionTwo(parsed) ?? migrateVersionOne(parsed)
    if (migratedElements) {
      return {
        elements: migratedElements,
        status: 'migrated',
        message: `Loaded and upgraded ${migratedElements.length} legacy element${migratedElements.length === 1 ? '' : 's'}.`,
      }
    }

    return { elements: [], status: 'invalid', message: 'Saved canvas data is invalid.' }
  } catch {
    return {
      elements: [],
      status: 'error',
      message: 'Saved canvas data is corrupted and could not be loaded.',
    }
  }
}

export const saveCanvasToStorage = (elements: CanvasElement[]) => {
  try {
    const canvasState: CanvasState = { version: 3, elements }
    localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(canvasState))
    return true
  } catch {
    return false
  }
}
