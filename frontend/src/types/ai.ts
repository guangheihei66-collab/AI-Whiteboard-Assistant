import type { ElementType } from './canvas'

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

export interface APIErrorResponse {
  error: {
    code: string
    message: string
    details?: string[]
  }
}
