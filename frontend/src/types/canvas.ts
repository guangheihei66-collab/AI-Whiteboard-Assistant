export type ToolType = 'pen' | 'rectangle' | 'circle' | 'text' | 'eraser'
export type ElementType = 'line' | 'rectangle' | 'circle' | 'text'

export interface Point {
  x: number
  y: number
}

interface BaseElement {
  id: string
  type: ElementType
  color: string
}

export interface LineElement extends BaseElement {
  type: 'line'
  points: number[]
  strokeWidth: number
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  strokeWidth: number
}

export interface CircleElement extends BaseElement {
  type: 'circle'
  x: number
  y: number
  radius: number
  strokeWidth: number
}

export interface TextElement extends BaseElement {
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
}

export type CanvasElement = LineElement | RectangleElement | CircleElement | TextElement

export interface CanvasState {
  version: 2
  elements: CanvasElement[]
}
