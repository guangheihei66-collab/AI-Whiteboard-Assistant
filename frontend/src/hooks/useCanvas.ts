import { useCallback, useRef, useState } from 'react'
import type {
  CanvasController,
  CanvasState,
  LineData,
  Point,
  ToolType,
} from '../types/canvas'

const STORAGE_KEY = 'ai-whiteboard-assistant.canvas.v1'

const createLineId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `line-${Date.now()}-${Math.random().toString(36).slice(2)}`

const isLineData = (value: unknown): value is LineData => {
  if (!value || typeof value !== 'object') return false

  const line = value as Partial<LineData>
  return (
    typeof line.id === 'string' &&
    line.tool === 'pen' &&
    Array.isArray(line.points) &&
    line.points.length >= 2 &&
    line.points.length % 2 === 0 &&
    line.points.every((point) => typeof point === 'number' && Number.isFinite(point)) &&
    typeof line.stroke === 'string' &&
    typeof line.strokeWidth === 'number' &&
    Number.isFinite(line.strokeWidth)
  )
}

const isCanvasState = (value: unknown): value is CanvasState => {
  if (!value || typeof value !== 'object') return false

  const state = value as Partial<CanvasState>
  return state.version === 1 && Array.isArray(state.lines) && state.lines.every(isLineData)
}

export function useCanvas(): CanvasController {
  const [currentTool, setCurrentToolState] = useState<ToolType>('pen')
  const [lines, setLines] = useState<LineData[]>([])
  const [statusMessage, setStatusMessage] = useState(
    'Your canvas is ready. Start drawing with the Pen tool.',
  )
  const isDrawing = useRef(false)
  const activeLineId = useRef<string | null>(null)

  const endDrawing = useCallback(() => {
    isDrawing.current = false
    activeLineId.current = null
  }, [])

  const setCurrentTool = useCallback(
    (tool: ToolType) => {
      endDrawing()
      setCurrentToolState(tool)
      if (tool === 'pen') {
        setStatusMessage('Pen selected. Drag on the canvas to draw.')
      } else {
        setStatusMessage(`${tool[0].toUpperCase()}${tool.slice(1)} is ready for a future phase.`)
      }
    },
    [endDrawing],
  )

  const startDrawing = useCallback(
    (point: Point | null) => {
      if (currentTool !== 'pen' || !point) return

      const id = createLineId()
      const line: LineData = {
        id,
        tool: 'pen',
        points: [point.x, point.y],
        stroke: '#0f172a',
        strokeWidth: 3,
      }

      isDrawing.current = true
      activeLineId.current = id
      setLines((currentLines) => [...currentLines, line])
      setStatusMessage('Drawing with Pen.')
    },
    [currentTool],
  )

  const continueDrawing = useCallback((point: Point | null) => {
    const lineId = activeLineId.current
    if (!isDrawing.current || !lineId || !point) return

    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === lineId
          ? { ...line, points: [...line.points, point.x, point.y] }
          : line,
      ),
    )
  }, [])

  const undo = useCallback(() => {
    endDrawing()
    setLines((currentLines) => currentLines.slice(0, -1))
    setStatusMessage('Removed the most recent line.')
  }, [endDrawing])

  const clear = useCallback(() => {
    endDrawing()
    setLines([])
    setStatusMessage('Canvas cleared.')
  }, [endDrawing])

  const save = useCallback(() => {
    const canvasState: CanvasState = { version: 1, lines }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(canvasState))
      setStatusMessage(`Saved ${lines.length} line${lines.length === 1 ? '' : 's'} locally.`)
    } catch {
      setStatusMessage('Unable to save. Browser storage may be unavailable.')
    }
  }, [lines])

  const load = useCallback(() => {
    endDrawing()

    try {
      const savedCanvas = localStorage.getItem(STORAGE_KEY)
      if (!savedCanvas) {
        setStatusMessage('No saved canvas was found.')
        return
      }

      const parsedCanvas: unknown = JSON.parse(savedCanvas)
      if (!isCanvasState(parsedCanvas)) {
        setStatusMessage('Saved canvas data is invalid and was not loaded.')
        return
      }

      setLines(parsedCanvas.lines)
      setStatusMessage(
        `Loaded ${parsedCanvas.lines.length} line${parsedCanvas.lines.length === 1 ? '' : 's'}.`,
      )
    } catch {
      setStatusMessage('Unable to load the saved canvas.')
    }
  }, [endDrawing])

  return {
    currentTool,
    lines,
    statusMessage,
    setCurrentTool,
    startDrawing,
    continueDrawing,
    endDrawing,
    undo,
    clear,
    save,
    load,
  }
}
