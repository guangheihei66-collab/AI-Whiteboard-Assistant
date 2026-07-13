import { useEffect, useRef, useState } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import { Layer, Line, Stage } from 'react-konva'
import type { LineData, Point, ToolType } from '../types/canvas'

interface CanvasProps {
  lines: LineData[]
  currentTool: ToolType
  onDrawStart: (point: Point | null) => void
  onDrawMove: (point: Point | null) => void
  onDrawEnd: () => void
}

export function Canvas({
  lines,
  currentTool,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
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
        className={`canvas-grid relative flex-1 overflow-hidden ${
          currentTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'
        }`}
        data-testid="whiteboard-canvas"
        data-line-count={lines.length}
        role="application"
        aria-label="Interactive whiteboard canvas"
      >
        {size.width > 0 && size.height > 0 && (
          <Stage
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
              {lines.map((line) => (
                <Line
                  key={line.id}
                  points={line.points}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  lineCap="round"
                  lineJoin="round"
                  tension={0.35}
                  listening={false}
                />
              ))}
            </Layer>
          </Stage>
        )}
      </div>
    </section>
  )
}
