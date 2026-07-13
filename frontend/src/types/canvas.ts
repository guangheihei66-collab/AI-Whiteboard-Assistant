export type ToolType = 'pen' | 'rectangle' | 'circle' | 'text' | 'eraser'

export interface Point {
  x: number
  y: number
}

export interface LineData {
  id: string
  tool: 'pen'
  points: number[]
  stroke: string
  strokeWidth: number
}

export interface CanvasState {
  version: 1
  lines: LineData[]
}

export interface CanvasController {
  currentTool: ToolType
  lines: LineData[]
  statusMessage: string
  setCurrentTool: (tool: ToolType) => void
  startDrawing: (point: Point | null) => void
  continueDrawing: (point: Point | null) => void
  endDrawing: () => void
  undo: () => void
  clear: () => void
  save: () => void
  load: () => void
}
