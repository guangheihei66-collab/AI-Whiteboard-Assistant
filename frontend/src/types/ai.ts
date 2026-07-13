import type { CanvasElement, ElementType } from './canvas'

export type AIMode = 'mock' | 'live'
export type ElementCounts = Record<ElementType, number>

export interface AIAnalysis {
  summary: string
  elementCounts: ElementCounts
  observations: string[]
  suggestions: string[]
  nextActions: string[]
}

export interface AnalyzeResponse {
  mode: AIMode
  analysis: AIAnalysis
}

export interface CanvasDimensions {
  width: number
  height: number
}

export interface GenerationProposal {
  title: string
  description: string
  elements: CanvasElement[]
}

export interface GenerateResponse {
  mode: AIMode
  proposal: GenerationProposal
}

export interface APIErrorResponse {
  error: {
    code: string
    message: string
    details?: string[]
  }
}
