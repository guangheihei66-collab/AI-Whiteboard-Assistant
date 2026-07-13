import type { AnalyzeResponse, APIErrorResponse, ElementCounts } from '../types/ai'
import type { CanvasElement, ElementType } from '../types/canvas'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
)

const elementTypes: ElementType[] = ['line', 'rectangle', 'circle', 'text']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const parseElementCounts = (value: unknown): ElementCounts | null => {
  if (!isRecord(value)) return null
  const entries = elementTypes.map((type) => [type, value[type]] as const)
  if (entries.some(([, count]) => !Number.isInteger(count) || Number(count) < 0)) return null
  return Object.fromEntries(entries) as ElementCounts
}

const parseAnalyzeResponse = (value: unknown): AnalyzeResponse | null => {
  if (!isRecord(value) || (value.mode !== 'mock' && value.mode !== 'live')) return null
  if (!isRecord(value.analysis)) return null

  const counts = parseElementCounts(value.analysis.elementCounts)
  if (
    typeof value.analysis.summary !== 'string' ||
    !counts ||
    !isStringArray(value.analysis.observations) ||
    !isStringArray(value.analysis.suggestions) ||
    !isStringArray(value.analysis.nextActions)
  ) {
    return null
  }

  return {
    mode: value.mode,
    analysis: {
      summary: value.analysis.summary,
      elementCounts: counts,
      observations: value.analysis.observations,
      suggestions: value.analysis.suggestions,
      nextActions: value.analysis.nextActions,
    },
  }
}

const parseErrorResponse = (value: unknown): APIErrorResponse | null => {
  if (!isRecord(value) || !isRecord(value.error)) return null
  if (typeof value.error.code !== 'string' || typeof value.error.message !== 'string') return null

  const details = isStringArray(value.error.details) ? value.error.details : undefined
  return { error: { code: value.error.code, message: value.error.message, details } }
}

export class AIServiceError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number, message: string) {
    super(message)
    this.name = 'AIServiceError'
    this.code = code
    this.status = status
  }
}

interface AnalyzeWhiteboardInput {
  message: string
  elements: CanvasElement[]
  signal: AbortSignal
}

export const analyzeWhiteboard = async ({
  message,
  elements,
  signal,
}: AnalyzeWhiteboardInput): Promise<AnalyzeResponse> => {
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, elements }),
      signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new AIServiceError(
      'NETWORK_ERROR',
      0,
      'Unable to reach the AI service. Start the backend and try again.',
    )
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const parsedError = parseErrorResponse(body)
    throw new AIServiceError(
      parsedError?.error.code ?? 'AI_REQUEST_FAILED',
      response.status,
      parsedError?.error.message ?? 'AI analysis is temporarily unavailable.',
    )
  }

  const parsed = parseAnalyzeResponse(body)
  if (!parsed) {
    throw new AIServiceError(
      'INVALID_RESPONSE',
      502,
      'The AI service returned an unexpected response. Please try again.',
    )
  }

  return parsed
}
