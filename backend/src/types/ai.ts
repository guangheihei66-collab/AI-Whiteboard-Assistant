export const elementTypes = ['line', 'rectangle', 'circle', 'text'] as const

export type ElementType = (typeof elementTypes)[number]
export type AIMode = 'mock' | 'live'

export interface ElementCounts {
  line: number
  rectangle: number
  circle: number
  text: number
}

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

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: string[]
  }
}

export interface AppConfig {
  port: number
  frontendOrigin: string
  mockMode: boolean
  openAIApiKey?: string
  openAIModel: string
  openAITimeoutMs: number
  aiRateLimit: number
}

export interface ModelAnalysis {
  summary: string
  observations: string[]
  suggestions: string[]
  nextActions: string[]
}

export interface LiveAnalysisInput {
  message: string
  canvasSummary: string
  signal: AbortSignal
}

export type LiveAnalysisRunner = (input: LiveAnalysisInput) => Promise<unknown>
