import type {
  AnalyzeResponse,
  APIErrorResponse,
  CanvasDimensions,
  ElementCounts,
  GenerateResponse,
} from '../types/ai'
import type { CanvasElement, ElementType } from '../types/canvas'
import { normalizeGeneratedProposal } from '../utils/normalizeGeneratedElements'

export const resolveAPIBaseUrl = (
  configuredUrl: string | undefined,
  isDevelopment: boolean,
) => {
  const normalized = configuredUrl?.trim().replace(/\/$/, '')
  if (normalized) return normalized
  return isDevelopment ? 'http://localhost:3001' : ''
}

const apiBaseUrl = resolveAPIBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV)

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

interface GenerateWhiteboardInput {
  message: string
  canvas: CanvasDimensions
  existingElements: CanvasElement[]
  signal: AbortSignal
}

const requestAI = async (path: string, payload: unknown, signal: AbortSignal) => {
  if (!apiBaseUrl) {
    throw new AIServiceError(
      'API_NOT_CONFIGURED',
      0,
      'The AI service URL is not configured for this deployment.',
    )
  }

  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
      parsedError?.error.message ?? 'The AI service is temporarily unavailable.',
    )
  }
  return body
}

export const analyzeWhiteboard = async ({
  message,
  elements,
  signal,
}: AnalyzeWhiteboardInput): Promise<AnalyzeResponse> => {
  const body = await requestAI('/api/ai/analyze', { message, elements }, signal)
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

export const generateWhiteboard = async ({
  message,
  canvas,
  existingElements,
  signal,
}: GenerateWhiteboardInput): Promise<GenerateResponse> => {
  const body = await requestAI(
    '/api/ai/generate',
    { message, canvas, existingElements },
    signal,
  )

  if (!isRecord(body) || (body.mode !== 'mock' && body.mode !== 'live')) {
    throw new AIServiceError(
      'INVALID_RESPONSE',
      502,
      'The AI service returned an unexpected generation response.',
    )
  }

  const proposal = normalizeGeneratedProposal(body.proposal, canvas)
  if (!proposal) {
    throw new AIServiceError(
      'INVALID_RESPONSE',
      502,
      'The AI service returned an invalid whiteboard proposal.',
    )
  }

  return { mode: body.mode, proposal }
}
