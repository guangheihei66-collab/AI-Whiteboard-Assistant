export type ToolType = 'select' | 'pen' | 'rectangle' | 'circle' | 'text' | 'eraser'
export type ElementType = 'line' | 'rectangle' | 'circle' | 'text'

export interface Point {
  x: number
  y: number
}

interface BaseElement {
  id: string
  type: ElementType
  color: string
  rotation: number
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
  radiusX: number
  radiusY: number
  strokeWidth: number
}

export interface TextElement extends BaseElement {
  type: 'text'
  x: number
  y: number
  text: string
  width: number
  fontSize: number
}

export type CanvasElement = LineElement | RectangleElement | CircleElement | TextElement

export interface CanvasState {
  version: 3
  elements: CanvasElement[]
}

export interface ElementTransform {
  x: number
  y: number
  rotation: number
  width?: number
  height?: number
  radiusX?: number
  radiusY?: number
  fontSize?: number
}
