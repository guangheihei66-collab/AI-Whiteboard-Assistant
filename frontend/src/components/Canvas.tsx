import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Ellipse, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type {
  CanvasElement,
  ElementTransform,
  Point,
  ToolType,
} from '../types/canvas'
import { SelectionTransformer } from './SelectionTransformer'

interface CanvasProps {
  elements: CanvasElement[]
  currentTool: ToolType
  selectedElementId: string | null
  selectedElement: CanvasElement | null
  stageRef: RefObject<Konva.Stage | null>
  onDrawStart: (point: Point | null) => void
  onDrawMove: (point: Point | null) => void
  onDrawEnd: () => void
  onSelect: (id: string | null) => void
  onMove: (id: string, position: Point) => void
  onTransform: (id: string, transform: ElementTransform) => void
  onErase: (id: string) => void
}

const cursorByTool: Record<ToolType, string> = {
  select: 'cursor-default',
  pen: 'cursor-crosshair',
  rectangle: 'cursor-crosshair',
  circle: 'cursor-crosshair',
  text: 'cursor-text',
  eraser: 'cursor-cell',
}

export function Canvas({
  elements,
  currentTool,
  selectedElementId,
  selectedElement,
  stageRef,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onSelect,
  onMove,
  onTransform,
  onErase,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      setSize({ width: container.clientWidth, height: container.clientHeight })
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  const getPointer = (event: KonvaEventObject<MouseEvent | TouchEvent>) =>
    event.target.getStage()?.getPointerPosition() ?? null

  const handleStagePointerDown = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const isBlankCanvas = event.target === event.target.getStage()
    if (currentTool === 'select') {
      if (isBlankCanvas) onSelect(null)
      return
    }
    onDrawStart(getPointer(event))
  }

  const handleElementPointer = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
    id: string,
  ) => {
    event.cancelBubble = true
    if (currentTool === 'select') onSelect(id)
    else if (currentTool === 'eraser') onErase(id)
  }

  const handleDragStart = (event: KonvaEventObject<DragEvent>, id: string) => {
    event.cancelBubble = true
    onSelect(id)
  }

  const handleDragEnd = (
    event: KonvaEventObject<DragEvent>,
    element: CanvasElement,
  ) => {
    event.cancelBubble = true
    const node = event.target
    if (element.type === 'line') {
      const delta = { x: node.x(), y: node.y() }
      node.position({ x: 0, y: 0 })
      onMove(element.id, delta)
      return
    }
    onMove(element.id, { x: node.x(), y: node.y() })
  }

  const elementCounts = elements.reduce(
    (counts, element) => ({ ...counts, [element.type]: counts[element.type] + 1 }),
    { line: 0, rectangle: 0, circle: 0, text: 0 },
  )
  const isSelecting = currentTool === 'select'
  const isErasing = currentTool === 'eraser'
  const isInteractive = isSelecting || isErasing

  return (
    <section className="flex min-w-[520px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
        <div>
          <h1 className="font-semibold text-slate-900">AI Whiteboard</h1>
          <p className="text-xs text-slate-500">Sketch, select, and refine your ideas.</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium capitalize text-indigo-700">
          {currentTool}
        </span>
      </header>

      <div
        ref={containerRef}
        className={`canvas-grid relative flex-1 overflow-hidden ${cursorByTool[currentTool]}`}
        data-testid="whiteboard-canvas"
        data-element-count={elements.length}
        data-line-count={elementCounts.line}
        data-rectangle-count={elementCounts.rectangle}
        data-circle-count={elementCounts.circle}
        data-text-count={elementCounts.text}
        data-selected-id={selectedElementId ?? ''}
        data-element-order={elements.map((element) => element.id).join(',')}
        role="application"
        aria-label="Interactive whiteboard canvas"
      >
        {size.width > 0 && size.height > 0 && (
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            onMouseDown={handleStagePointerDown}
            onMouseMove={(event) => onDrawMove(getPointer(event))}
            onMouseUp={onDrawEnd}
            onMouseLeave={onDrawEnd}
            onTouchStart={handleStagePointerDown}
            onTouchMove={(event) => onDrawMove(getPointer(event))}
            onTouchEnd={onDrawEnd}
          >
            <Layer>
              <Rect width={size.width} height={size.height} fill="#ffffff" listening={false} />
              {elements.map((element) => {
                const interactionProps = {
                  id: element.id,
                  listening: isInteractive,
                  draggable: isSelecting,
                  onClick: (event: KonvaEventObject<MouseEvent>) =>
                    handleElementPointer(event, element.id),
                  onTap: (event: KonvaEventObject<TouchEvent>) =>
                    handleElementPointer(event, element.id),
                  onDragStart: (event: KonvaEventObject<DragEvent>) =>
                    handleDragStart(event, element.id),
                  onDragEnd: (event: KonvaEventObject<DragEvent>) =>
                    handleDragEnd(event, element),
                }

                switch (element.type) {
                  case 'line':
                    return (
                      <Line
                        key={element.id}
                        x={0}
                        y={0}
                        points={element.points}
                        stroke={element.color}
                        strokeWidth={element.strokeWidth}
                        hitStrokeWidth={Math.max(12, element.strokeWidth)}
                        lineCap="round"
                        lineJoin="round"
                        tension={0.35}
                        {...interactionProps}
                      />
                    )
                  case 'rectangle':
                    return (
                      <Rect
                        key={element.id}
                        x={element.x}
                        y={element.y}
                        width={element.width}
                        height={element.height}
                        rotation={element.rotation}
                        fill={isInteractive ? 'rgba(255,255,255,0.01)' : undefined}
                        stroke={element.color}
                        strokeWidth={element.strokeWidth}
                        hitStrokeWidth={Math.max(12, element.strokeWidth)}
                        {...interactionProps}
                      />
                    )
                  case 'circle':
                    return (
                      <Ellipse
                        key={element.id}
                        x={element.x}
                        y={element.y}
                        radiusX={element.radiusX}
                        radiusY={element.radiusY}
                        rotation={element.rotation}
                        fill={isInteractive ? 'rgba(255,255,255,0.01)' : undefined}
                        stroke={element.color}
                        strokeWidth={element.strokeWidth}
                        hitStrokeWidth={Math.max(12, element.strokeWidth)}
                        {...interactionProps}
                      />
                    )
                  case 'text':
                    return (
                      <Text
                        key={element.id}
                        x={element.x}
                        y={element.y}
                        width={element.width}
                        text={element.text}
                        fill={element.color}
                        fontSize={element.fontSize}
                        rotation={element.rotation}
                        fontFamily="Inter, sans-serif"
                        hitStrokeWidth={10}
                        {...interactionProps}
                      />
                    )
                }
              })}
              <SelectionTransformer
                stageRef={stageRef}
                selectedElement={selectedElement}
                onTransformEnd={onTransform}
              />
            </Layer>
          </Stage>
        )}
      </div>
    </section>
  )
}
