import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Circle, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { CanvasElement, Point, ToolType } from '../types/canvas'

interface CanvasProps {
  elements: CanvasElement[]
  currentTool: ToolType
  stageRef: RefObject<Konva.Stage | null>
  onDrawStart: (point: Point | null) => void
  onDrawMove: (point: Point | null) => void
  onDrawEnd: () => void
  onErase: (id: string) => void
}

const cursorByTool: Record<ToolType, string> = {
  pen: 'cursor-crosshair',
  rectangle: 'cursor-crosshair',
  circle: 'cursor-crosshair',
  text: 'cursor-text',
  eraser: 'cursor-cell',
}

export function Canvas({
  elements,
  currentTool,
  stageRef,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
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

  const handleErase = (event: KonvaEventObject<MouseEvent | TouchEvent>, id: string) => {
    event.cancelBubble = true
    onErase(id)
  }

  const elementCounts = elements.reduce(
    (counts, element) => ({ ...counts, [element.type]: counts[element.type] + 1 }),
    { line: 0, rectangle: 0, circle: 0, text: 0 },
  )
  const isErasing = currentTool === 'eraser'

  return (
    <section className="flex min-w-[520px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
        <div>
          <h1 className="font-semibold text-slate-900">AI Whiteboard</h1>
          <p className="text-xs text-slate-500">Sketch ideas, then make them smarter.</p>
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
        role="application"
        aria-label="Interactive whiteboard canvas"
      >
        {size.width > 0 && size.height > 0 && (
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            onMouseDown={(event) => onDrawStart(getPointer(event))}
            onMouseMove={(event) => onDrawMove(getPointer(event))}
            onMouseUp={onDrawEnd}
            onMouseLeave={onDrawEnd}
            onTouchStart={(event) => onDrawStart(getPointer(event))}
            onTouchMove={(event) => onDrawMove(getPointer(event))}
            onTouchEnd={onDrawEnd}
          >
            <Layer>
              <Rect width={size.width} height={size.height} fill="#ffffff" listening={false} />
              {elements.map((element) => {
                const eraseProps = {
                  listening: isErasing,
                  onClick: (event: KonvaEventObject<MouseEvent>) => handleErase(event, element.id),
                  onTap: (event: KonvaEventObject<TouchEvent>) => handleErase(event, element.id),
                }

                switch (element.type) {
                  case 'line':
                    return (
                      <Line
                        key={element.id}
                        points={element.points}
                        stroke={element.color}
                        strokeWidth={element.strokeWidth}
                        hitStrokeWidth={Math.max(12, element.strokeWidth)}
                        lineCap="round"
                        lineJoin="round"
                        tension={0.35}
                        {...eraseProps}
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
                        stroke={element.color}
                        strokeWidth={element.strokeWidth}
                        hitStrokeWidth={Math.max(12, element.strokeWidth)}
                        {...eraseProps}
                      />
                    )
                  case 'circle':
                    return (
                      <Circle
                        key={element.id}
                        x={element.x}
                        y={element.y}
                        radius={element.radius}
                        stroke={element.color}
                        strokeWidth={element.strokeWidth}
                        hitStrokeWidth={Math.max(12, element.strokeWidth)}
                        {...eraseProps}
                      />
                    )
                  case 'text':
                    return (
                      <Text
                        key={element.id}
                        x={element.x}
                        y={element.y}
                        text={element.text}
                        fill={element.color}
                        fontSize={element.fontSize}
                        fontFamily="Inter, sans-serif"
                        hitStrokeWidth={10}
                        {...eraseProps}
                      />
                    )
                }
              })}
            </Layer>
          </Stage>
        )}
      </div>
    </section>
  )
}
