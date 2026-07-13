import type Konva from 'konva'
import { useCallback, useRef, useState } from 'react'
import type {
  CanvasElement,
  CircleElement,
  ElementTransform,
  ElementType,
  LineElement,
  Point,
  RectangleElement,
  TextElement,
  ToolType,
} from '../types/canvas'
import { loadCanvasFromStorage, saveCanvasToStorage } from '../utils/storage'
import { useAutoSave } from './useAutoSave'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

const DEFAULT_COLOR = '#0f172a'
const DEFAULT_STROKE_WIDTH = 3
const MAX_HISTORY_ENTRIES = 100

interface ActiveElement {
  id: string
  type: Exclude<ElementType, 'text'>
  start: Point
}

interface CanvasHistory {
  past: CanvasElement[][]
  present: CanvasElement[]
  future: CanvasElement[][]
}

const createElementId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `element-${Date.now()}-${Math.random().toString(36).slice(2)}`

const estimateTextWidth = (text: string, fontSize: number) =>
  Math.max(40, Math.ceil(text.length * fontSize * 0.62))

const appendPast = (past: CanvasElement[][], snapshot: CanvasElement[]) =>
  [...past, snapshot].slice(-MAX_HISTORY_ENTRIES)

export function useCanvas() {
  const initialLoadRef = useRef<ReturnType<typeof loadCanvasFromStorage> | null>(null)
  if (initialLoadRef.current === null) initialLoadRef.current = loadCanvasFromStorage()
  const initialLoad = initialLoadRef.current

  const [currentTool, setCurrentToolState] = useState<ToolType>('pen')
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR)
  const [strokeWidth, setStrokeWidthState] = useState(DEFAULT_STROKE_WIDTH)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [history, setHistory] = useState<CanvasHistory>(() => ({
    past: [],
    present:
      initialLoad.status === 'loaded' || initialLoad.status === 'migrated'
        ? initialLoad.elements
        : [],
    future: [],
  }))
  const [statusMessage, setStatusMessage] = useState(() => {
    if (initialLoad.status === 'loaded') {
      return `Automatically restored ${initialLoad.elements.length} element${initialLoad.elements.length === 1 ? '' : 's'}.`
    }
    if (initialLoad.status === 'migrated') return initialLoad.message
    if (initialLoad.status === 'invalid' || initialLoad.status === 'error') {
      return initialLoad.message
    }
    return 'Your canvas is ready. Start drawing with the Pen tool.'
  })
  const activeElementRef = useRef<ActiveElement | null>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const elements = history.present

  const commitElements = useCallback(
    (updater: (currentElements: CanvasElement[]) => CanvasElement[]) => {
      setHistory((current) => {
        const nextElements = updater(current.present)
        if (nextElements === current.present) return current
        return {
          past: appendPast(current.past, current.present),
          present: nextElements,
          future: [],
        }
      })
    },
    [],
  )

  const updatePresent = useCallback(
    (updater: (currentElements: CanvasElement[]) => CanvasElement[]) => {
      setHistory((current) => {
        const nextElements = updater(current.present)
        return nextElements === current.present ? current : { ...current, present: nextElements }
      })
    },
    [],
  )

  const clearSelection = useCallback(() => setSelectedElementId(null), [])

  const endDrawing = useCallback(() => {
    activeElementRef.current = null
  }, [])

  const setCurrentTool = useCallback(
    (tool: ToolType) => {
      endDrawing()
      setCurrentToolState(tool)
      if (tool !== 'select') clearSelection()

      const instructions: Record<ToolType, string> = {
        select: 'Select enabled. Click an element to edit it.',
        pen: 'Pen selected. Drag on the canvas to draw.',
        rectangle: 'Rectangle selected. Drag to create a rectangle.',
        circle: 'Circle selected. Drag outward from the center.',
        text: 'Text selected. Click the canvas to add text.',
        eraser: 'Eraser selected. Click an element to remove it.',
      }
      setStatusMessage(instructions[tool])
    },
    [clearSelection, endDrawing],
  )

  const setStrokeWidth = useCallback((width: number) => {
    if (!Number.isFinite(width)) return
    setStrokeWidthState(Math.min(16, Math.max(1, width)))
  }, [])

  const selectElement = useCallback(
    (id: string | null) => {
      if (currentTool !== 'select') return
      setSelectedElementId(id)
      setStatusMessage(id ? 'Element selected.' : 'Selection cleared.')
    },
    [currentTool],
  )

  const startDrawing = useCallback(
    (point: Point | null) => {
      if (!point || currentTool === 'select' || currentTool === 'eraser') return

      if (currentTool === 'text') {
        const text = window.prompt('Enter text for the whiteboard:')?.trim()
        if (!text) {
          setStatusMessage('Text creation cancelled.')
          return
        }

        const fontSize = Math.max(18, strokeWidth * 5)
        const textElement: TextElement = {
          id: createElementId(),
          type: 'text',
          x: point.x,
          y: point.y,
          text,
          width: estimateTextWidth(text, fontSize),
          color: currentColor,
          fontSize,
          rotation: 0,
        }
        commitElements((currentElements) => [...currentElements, textElement])
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
          rotation: 0,
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
          rotation: 0,
        }
      } else {
        element = {
          id,
          type: 'circle',
          x: point.x,
          y: point.y,
          radiusX: 0,
          radiusY: 0,
          color: currentColor,
          strokeWidth,
          rotation: 0,
        }
      }

      activeElementRef.current = { id, type: element.type, start: point }
      commitElements((currentElements) => [...currentElements, element])
      setStatusMessage(`Drawing ${element.type}.`)
    },
    [commitElements, currentColor, currentTool, strokeWidth],
  )

  const continueDrawing = useCallback(
    (point: Point | null) => {
      const active = activeElementRef.current
      if (!active || !point) return

      updatePresent((currentElements) =>
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
            const radius = Math.hypot(point.x - active.start.x, point.y - active.start.y)
            return { ...element, radiusX: radius, radiusY: radius }
          }

          return element
        }),
      )
    },
    [updatePresent],
  )

  const commitElementUpdate = useCallback(
    (id: string, updater: (element: CanvasElement) => CanvasElement) => {
      commitElements((currentElements) => {
        let changed = false
        const nextElements = currentElements.map((element) => {
          if (element.id !== id) return element
          const nextElement = updater(element)
          changed = nextElement !== element
          return nextElement
        })
        return changed ? nextElements : currentElements
      })
    },
    [commitElements],
  )

  const moveElement = useCallback(
    (id: string, position: Point) => {
      commitElementUpdate(id, (element) => {
        if (element.type === 'line') {
          if (position.x === 0 && position.y === 0) return element
          return {
            ...element,
            points: element.points.map((coordinate, index) =>
              coordinate + (index % 2 === 0 ? position.x : position.y),
            ),
          }
        }

        if (element.x === position.x && element.y === position.y) return element
        return { ...element, x: position.x, y: position.y }
      })
      setStatusMessage('Element moved.')
    },
    [commitElementUpdate],
  )

  const transformElement = useCallback(
    (id: string, transform: ElementTransform) => {
      commitElementUpdate(id, (element) => {
        if (element.type === 'line') return element
        if (element.type === 'rectangle') {
          return {
            ...element,
            x: transform.x,
            y: transform.y,
            width: Math.max(10, transform.width ?? element.width),
            height: Math.max(10, transform.height ?? element.height),
            rotation: transform.rotation,
          }
        }
        if (element.type === 'circle') {
          return {
            ...element,
            x: transform.x,
            y: transform.y,
            radiusX: Math.max(5, transform.radiusX ?? element.radiusX),
            radiusY: Math.max(5, transform.radiusY ?? element.radiusY),
            rotation: transform.rotation,
          }
        }
        return {
          ...element,
          x: transform.x,
          y: transform.y,
          width: Math.max(10, transform.width ?? element.width),
          fontSize: Math.max(10, transform.fontSize ?? element.fontSize),
          rotation: transform.rotation,
        }
      })
      setStatusMessage('Element transformed.')
    },
    [commitElementUpdate],
  )

  const eraseElement = useCallback(
    (id: string) => {
      if (currentTool !== 'eraser') return
      commitElements((currentElements) => {
        const nextElements = currentElements.filter((element) => element.id !== id)
        return nextElements.length === currentElements.length ? currentElements : nextElements
      })
      if (selectedElementId === id) clearSelection()
      setStatusMessage('Element erased.')
    },
    [clearSelection, commitElements, currentTool, selectedElementId],
  )

  const deleteSelected = useCallback(() => {
    if (!selectedElementId) return
    const id = selectedElementId
    commitElements((currentElements) => {
      const nextElements = currentElements.filter((element) => element.id !== id)
      return nextElements.length === currentElements.length ? currentElements : nextElements
    })
    clearSelection()
    setStatusMessage('Selected element deleted.')
  }, [clearSelection, commitElements, selectedElementId])

  const undo = useCallback(() => {
    endDrawing()
    clearSelection()
    setHistory((current) => {
      const previous = current.past.at(-1)
      if (!previous) return current
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      }
    })
    setStatusMessage('Undo completed.')
  }, [clearSelection, endDrawing])

  const redo = useCallback(() => {
    endDrawing()
    clearSelection()
    setHistory((current) => {
      const next = current.future[0]
      if (!next) return current
      return {
        past: appendPast(current.past, current.present),
        present: next,
        future: current.future.slice(1),
      }
    })
    setStatusMessage('Redo completed.')
  }, [clearSelection, endDrawing])

  const clear = useCallback(() => {
    endDrawing()
    clearSelection()
    commitElements((currentElements) => (currentElements.length ? [] : currentElements))
    setStatusMessage('Canvas cleared.')
  }, [clearSelection, commitElements, endDrawing])

  const save = useCallback(() => {
    if (saveCanvasToStorage(elements)) {
      setStatusMessage(
        `Saved ${elements.length} element${elements.length === 1 ? '' : 's'} locally.`,
      )
    } else {
      setStatusMessage('Unable to save. Browser storage may be unavailable.')
    }
  }, [elements])

  const load = useCallback(() => {
    endDrawing()
    clearSelection()
    const result = loadCanvasFromStorage()
    if (result.status === 'loaded' || result.status === 'migrated') {
      setHistory({ past: [], present: result.elements, future: [] })
    }
    setStatusMessage(result.message)
  }, [clearSelection, endDrawing])

  const bringForward = useCallback(() => {
    if (!selectedElementId) return
    commitElements((currentElements) => {
      const index = currentElements.findIndex((element) => element.id === selectedElementId)
      if (index < 0 || index === currentElements.length - 1) return currentElements
      const nextElements = [...currentElements]
      ;[nextElements[index], nextElements[index + 1]] = [
        nextElements[index + 1],
        nextElements[index],
      ]
      return nextElements
    })
    setStatusMessage('Element moved forward one layer.')
  }, [commitElements, selectedElementId])

  const sendBackward = useCallback(() => {
    if (!selectedElementId) return
    commitElements((currentElements) => {
      const index = currentElements.findIndex((element) => element.id === selectedElementId)
      if (index <= 0) return currentElements
      const nextElements = [...currentElements]
      ;[nextElements[index - 1], nextElements[index]] = [
        nextElements[index],
        nextElements[index - 1],
      ]
      return nextElements
    })
    setStatusMessage('Element moved backward one layer.')
  }, [commitElements, selectedElementId])

  const exportPng = useCallback(() => {
    const stage = stageRef.current
    if (!stage) {
      setStatusMessage('Canvas is not ready to export.')
      return
    }

    const transformer = stage.findOne('.selection-transformer')
    const wasVisible = transformer?.visible() ?? false
    try {
      transformer?.hide()
      stage.draw()
      const link = document.createElement('a')
      link.download = `ai-whiteboard-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      link.href = stage.toDataURL({ pixelRatio: 2 })
      document.body.appendChild(link)
      link.click()
      link.remove()
      setStatusMessage('PNG exported successfully.')
    } catch {
      setStatusMessage('Unable to export the canvas as PNG.')
    } finally {
      if (wasVisible) transformer?.show()
      stage.draw()
    }
  }, [])

  useAutoSave(elements)
  useKeyboardShortcuts({
    setCurrentTool,
    deleteSelected,
    undo,
    redo,
    clearSelection,
    save,
  })

  const selectedIndex = selectedElementId
    ? elements.findIndex((element) => element.id === selectedElementId)
    : -1

  return {
    currentTool,
    currentColor,
    strokeWidth,
    elements,
    selectedElementId,
    selectedElement: elements.find((element) => element.id === selectedElementId) ?? null,
    statusMessage,
    stageRef,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    canBringForward: selectedIndex >= 0 && selectedIndex < elements.length - 1,
    canSendBackward: selectedIndex > 0,
    setCurrentTool,
    setCurrentColor,
    setStrokeWidth,
    selectElement,
    clearSelection,
    startDrawing,
    continueDrawing,
    endDrawing,
    moveElement,
    transformElement,
    eraseElement,
    deleteSelected,
    undo,
    redo,
    clear,
    save,
    load,
    bringForward,
    sendBackward,
    exportPng,
  }
}
