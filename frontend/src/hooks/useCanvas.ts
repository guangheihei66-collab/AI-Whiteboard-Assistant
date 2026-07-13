import type Konva from 'konva'
import { useCallback, useRef, useState } from 'react'
import type {
  CanvasElement,
  CanvasState,
  CircleElement,
  ElementType,
  LineElement,
  Point,
  RectangleElement,
  TextElement,
  ToolType,
} from '../types/canvas'

const STORAGE_KEY = 'ai-whiteboard-assistant.canvas.v1'
const DEFAULT_COLOR = '#0f172a'
const DEFAULT_STROKE_WIDTH = 3

interface ActiveElement {
  id: string
  type: Exclude<ElementType, 'text'>
  start: Point
}

interface LegacyLine {
  id: string
  tool: 'pen'
  points: number[]
  stroke: string
  strokeWidth: number
}

interface LegacyCanvasState {
  version: 1
  lines: LegacyLine[]
}

const createElementId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `element-${Date.now()}-${Math.random().toString(36).slice(2)}`

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const hasBaseElement = (value: unknown): value is Record<string, unknown> =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Record<string, unknown>).id === 'string' &&
      typeof (value as Record<string, unknown>).color === 'string',
  )

const isCanvasElement = (value: unknown): value is CanvasElement => {
  if (!hasBaseElement(value)) return false

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
        isFiniteNumber(value.height) &&
        isFiniteNumber(value.strokeWidth) &&
        value.strokeWidth > 0
      )
    case 'circle':
      return (
        isFiniteNumber(value.x) &&
        isFiniteNumber(value.y) &&
        isFiniteNumber(value.radius) &&
        value.radius >= 0 &&
        isFiniteNumber(value.strokeWidth) &&
        value.strokeWidth > 0
      )
    case 'text':
      return (
        isFiniteNumber(value.x) &&
        isFiniteNumber(value.y) &&
        typeof value.text === 'string' &&
        isFiniteNumber(value.fontSize) &&
        value.fontSize > 0
      )
    default:
      return false
  }
}

const isCanvasState = (value: unknown): value is CanvasState => {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<CanvasState>
  return state.version === 2 && Array.isArray(state.elements) && state.elements.every(isCanvasElement)
}

const isLegacyLine = (value: unknown): value is LegacyLine => {
  if (!value || typeof value !== 'object') return false
  const line = value as Partial<LegacyLine>
  return (
    typeof line.id === 'string' &&
    line.tool === 'pen' &&
    Array.isArray(line.points) &&
    line.points.length >= 2 &&
    line.points.length % 2 === 0 &&
    line.points.every(isFiniteNumber) &&
    typeof line.stroke === 'string' &&
    isFiniteNumber(line.strokeWidth) &&
    line.strokeWidth > 0
  )
}

const isLegacyCanvasState = (value: unknown): value is LegacyCanvasState => {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<LegacyCanvasState>
  return state.version === 1 && Array.isArray(state.lines) && state.lines.every(isLegacyLine)
}

const migrateLegacyLines = (lines: LegacyLine[]): LineElement[] =>
  lines.map((line) => ({
    id: line.id,
    type: 'line',
    points: line.points,
    color: line.stroke,
    strokeWidth: line.strokeWidth,
  }))

export function useCanvas() {
  const [currentTool, setCurrentToolState] = useState<ToolType>('pen')
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR)
  const [strokeWidth, setStrokeWidthState] = useState(DEFAULT_STROKE_WIDTH)
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [statusMessage, setStatusMessage] = useState(
    'Your canvas is ready. Start drawing with the Pen tool.',
  )
  const activeElementRef = useRef<ActiveElement | null>(null)
  const stageRef = useRef<Konva.Stage | null>(null)

  const endDrawing = useCallback(() => {
    activeElementRef.current = null
  }, [])

  const setCurrentTool = useCallback(
    (tool: ToolType) => {
      endDrawing()
      setCurrentToolState(tool)
      const instructions: Record<ToolType, string> = {
        pen: 'Pen selected. Drag on the canvas to draw.',
        rectangle: 'Rectangle selected. Drag to create a rectangle.',
        circle: 'Circle selected. Drag outward from the center.',
        text: 'Text selected. Click the canvas to add text.',
        eraser: 'Eraser selected. Click an element to remove it.',
      }
      setStatusMessage(instructions[tool])
    },
    [endDrawing],
  )

  const setStrokeWidth = useCallback((width: number) => {
    if (!Number.isFinite(width)) return
    setStrokeWidthState(Math.min(16, Math.max(1, width)))
  }, [])

  const startDrawing = useCallback(
    (point: Point | null) => {
      if (!point || currentTool === 'eraser') return

      if (currentTool === 'text') {
        const text = window.prompt('Enter text for the whiteboard:')?.trim()
        if (!text) {
          setStatusMessage('Text creation cancelled.')
          return
        }

        const textElement: TextElement = {
          id: createElementId(),
          type: 'text',
          x: point.x,
          y: point.y,
          text,
          color: currentColor,
          fontSize: Math.max(18, strokeWidth * 5),
        }
        setElements((currentElements) => [...currentElements, textElement])
        setStatusMessage('Text added to the canvas.')
        return
      }

      const id = createElementId()
      let element: LineElement | RectangleElement | CircleElement

      if (currentTool === 'pen') {
        element = {
          id,
          type: 'line',
          points: [point.x, point.y],
          color: currentColor,
          strokeWidth,
        }
      } else if (currentTool === 'rectangle') {
        element = {
          id,
          type: 'rectangle',
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          color: currentColor,
          strokeWidth,
        }
      } else {
        element = {
          id,
          type: 'circle',
          x: point.x,
          y: point.y,
          radius: 0,
          color: currentColor,
          strokeWidth,
        }
      }

      activeElementRef.current = { id, type: element.type, start: point }
      setElements((currentElements) => [...currentElements, element])
      setStatusMessage(`Drawing ${element.type}.`)
    },
    [currentColor, currentTool, strokeWidth],
  )

  const continueDrawing = useCallback((point: Point | null) => {
    const active = activeElementRef.current
    if (!active || !point) return

    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== active.id) return element

        if (element.type === 'line') {
          return { ...element, points: [...element.points, point.x, point.y] }
        }

        if (element.type === 'rectangle') {
          return {
            ...element,
            x: Math.min(active.start.x, point.x),
            y: Math.min(active.start.y, point.y),
            width: Math.abs(point.x - active.start.x),
            height: Math.abs(point.y - active.start.y),
          }
        }

        if (element.type === 'circle') {
          return {
            ...element,
            radius: Math.hypot(point.x - active.start.x, point.y - active.start.y),
          }
        }

        return element
      }),
    )
  }, [])

  const eraseElement = useCallback(
    (id: string) => {
      if (currentTool !== 'eraser') return
      setElements((currentElements) => currentElements.filter((element) => element.id !== id))
      setStatusMessage('Element erased.')
    },
    [currentTool],
  )

  const undo = useCallback(() => {
    endDrawing()
    setElements((currentElements) => currentElements.slice(0, -1))
    setStatusMessage('Removed the most recent element.')
  }, [endDrawing])

  const clear = useCallback(() => {
    endDrawing()
    setElements([])
    setStatusMessage('Canvas cleared.')
  }, [endDrawing])

  const save = useCallback(() => {
    const canvasState: CanvasState = { version: 2, elements }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(canvasState))
      setStatusMessage(
        `Saved ${elements.length} element${elements.length === 1 ? '' : 's'} locally.`,
      )
    } catch {
      setStatusMessage('Unable to save. Browser storage may be unavailable.')
    }
  }, [elements])

  const load = useCallback(() => {
    endDrawing()

    try {
      const savedCanvas = localStorage.getItem(STORAGE_KEY)
      if (!savedCanvas) {
        setStatusMessage('No saved canvas was found.')
        return
      }

      const parsedCanvas: unknown = JSON.parse(savedCanvas)
      if (isCanvasState(parsedCanvas)) {
        setElements(parsedCanvas.elements)
        setStatusMessage(
          `Loaded ${parsedCanvas.elements.length} element${
            parsedCanvas.elements.length === 1 ? '' : 's'
          }.`,
        )
        return
      }

      if (isLegacyCanvasState(parsedCanvas)) {
        const migratedElements = migrateLegacyLines(parsedCanvas.lines)
        setElements(migratedElements)
        setStatusMessage(`Loaded and upgraded ${migratedElements.length} legacy line${migratedElements.length === 1 ? '' : 's'}.`)
        return
      }

      setStatusMessage('Saved canvas data is invalid and was not loaded.')
    } catch {
      setStatusMessage('Unable to load the saved canvas.')
    }
  }, [endDrawing])

  const exportPng = useCallback(() => {
    try {
      const stage = stageRef.current
      if (!stage) {
        setStatusMessage('Canvas is not ready to export.')
        return
      }

      const link = document.createElement('a')
      link.download = `ai-whiteboard-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      link.href = stage.toDataURL({ pixelRatio: 2 })
      document.body.appendChild(link)
      link.click()
      link.remove()
      setStatusMessage('PNG exported successfully.')
    } catch {
      setStatusMessage('Unable to export the canvas as PNG.')
    }
  }, [])

  return {
    currentTool,
    currentColor,
    strokeWidth,
    elements,
    statusMessage,
    stageRef,
    setCurrentTool,
    setCurrentColor,
    setStrokeWidth,
    startDrawing,
    continueDrawing,
    endDrawing,
    eraseElement,
    undo,
    clear,
    save,
    load,
    exportPng,
  }
}
