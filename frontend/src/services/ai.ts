import type {
  AIRequestPhase,
  AnalyzeResponse,
  APIErrorResponse,
  CanvasDimensions,
  ElementCounts,
  GenerateResponse,
  HealthResponse,
} from '../types/ai'
import type { CanvasElement, ElementType } from '../types/canvas'
import { normalizeCanvasElementsForAI } from '../utils/normalizeCanvasForAI'
import { normalizeGeneratedProposal } from '../utils/normalizeGeneratedElements'

const HEALTH_CACHE_TTL_MS = 30_000
const HEALTH_TIMEOUT_MS = 60_000
const AI_REQUEST_TIMEOUT_MS = 35_000
const RETRY_DELAY_MS = 750

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

const parseHealthResponse = (value: unknown): HealthResponse | null => {
  if (!isRecord(value) || value.status !== 'ok') return null
  if (typeof value.service !== 'string' || typeof value.aiConfigured !== 'boolean') return null
  if (value.aiMode !== 'mock' && value.aiMode !== 'live') return null

  return {
    status: 'ok',
    service: value.service,
    aiMode: value.aiMode,
    aiConfigured: value.aiConfigured,
  }
}

const parseErrorResponse = (value: unknown): APIErrorResponse | null => {
  if (!isRecord(value) || !isRecord(value.error)) return null
  if (typeof value.error.code !== 'string' || typeof value.error.message !== 'string') return null

  const details = isStringArray(value.error.details) ? value.error.details : undefined
  const requestId = typeof value.error.requestId === 'string' ? value.error.requestId : undefined
  return { error: { code: value.error.code, message: value.error.message, details, requestId } }
}

const parseRetryAfterSeconds = (value: string | null) => {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds)

  const date = Date.parse(value)
  if (Number.isNaN(date)) return undefined
  return Math.max(0, Math.ceil((date - Date.now()) / 1_000))
}

interface AIServiceErrorOptions {
  requestId?: string
  retryAfterSeconds?: number
}

export class AIServiceError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId?: string
  readonly retryAfterSeconds?: number

  constructor(
    code: string,
    status: number,
    message: string,
    options: AIServiceErrorOptions = {},
  ) {
    super(message)
    this.name = 'AIServiceError'
    this.code = code
    this.status = status
    this.requestId = options.requestId
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}

type RequestPhaseHandler = (phase: AIRequestPhase) => void

interface AnalyzeWhiteboardInput {
  message: string
  elements: CanvasElement[]
  signal: AbortSignal
  onPhase?: RequestPhaseHandler
}

interface GenerateWhiteboardInput {
  message: string
  canvas: CanvasDimensions
  existingElements: CanvasElement[]
  signal: AbortSignal
  onPhase?: RequestPhaseHandler
}

interface FetchResult {
  response: Response
  body: unknown
}

interface HealthCacheEntry {
  expiresAt: number
  value: HealthResponse
}

let healthCache: HealthCacheEntry | null = null

export const clearAIHealthCache = () => {
  healthCache = null
}

const createAbortError = () => {
  const error = new Error('The operation was aborted.')
  error.name = 'AbortError'
  return error
}

const fetchJSONWithTimeout = async (
  url: string,
  init: RequestInit,
  externalSignal: AbortSignal,
  timeoutMs: number,
): Promise<FetchResult> => {
  if (externalSignal.aborted) throw createAbortError()

  const controller = new AbortController()
  let timedOut = false
  const handleExternalAbort = () => controller.abort()
  externalSignal.addEventListener('abort', handleExternalAbort, { once: true })
  const timer = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const body: unknown = await response.json().catch(() => null)
    return { response, body }
  } catch (error) {
    if (externalSignal.aborted) throw createAbortError()
    if (timedOut) {
      throw new AIServiceError(
        'REQUEST_TIMEOUT',
        0,
        'The AI service took too long to respond. Please try again.',
      )
    }
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new AIServiceError(
      'NETWORK_ERROR',
      0,
      'Unable to reach the AI service. Check the backend and network, then try again.',
    )
  } finally {
    window.clearTimeout(timer)
    externalSignal.removeEventListener('abort', handleExternalAbort)
  }
}

const delayWithAbort = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError())
      return
    }

    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, milliseconds)
    const handleAbort = () => {
      window.clearTimeout(timer)
      reject(createAbortError())
    }
    signal.addEventListener('abort', handleAbort, { once: true })
  })

const errorFromResponse = (response: Response, body: unknown) => {
  const parsedError = parseErrorResponse(body)
  const requestId = response.headers.get('X-Request-Id') ?? parsedError?.error.requestId
  return new AIServiceError(
    parsedError?.error.code ?? 'AI_REQUEST_FAILED',
    response.status,
    parsedError?.error.message ?? 'The AI service is temporarily unavailable.',
    {
      requestId: requestId || undefined,
      retryAfterSeconds: parseRetryAfterSeconds(response.headers.get('Retry-After')),
    },
  )
}

const isTransientFailure = (error: unknown) =>
  error instanceof AIServiceError &&
  (error.code === 'NETWORK_ERROR' || [502, 503, 504].includes(error.status))

const ensureAIHealth = async (signal: AbortSignal, onPhase?: RequestPhaseHandler) => {
  if (!apiBaseUrl) {
    throw new AIServiceError(
      'API_NOT_CONFIGURED',
      0,
      'The AI service URL is not configured for this deployment.',
    )
  }

  if (healthCache && healthCache.expiresAt > Date.now()) return healthCache.value

  onPhase?.('connecting')
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { response, body } = await fetchJSONWithTimeout(
        `${apiBaseUrl}/api/health`,
        { method: 'GET' },
        signal,
        HEALTH_TIMEOUT_MS,
      )
      if (!response.ok) throw errorFromResponse(response, body)

      const parsed = parseHealthResponse(body)
      if (!parsed) {
        throw new AIServiceError(
          'INVALID_HEALTH_RESPONSE',
          502,
          'The AI service health check returned an unexpected response.',
        )
      }

      healthCache = { value: parsed, expiresAt: Date.now() + HEALTH_CACHE_TTL_MS }
      return parsed
    } catch (error) {
      if (attempt === 0 && isTransientFailure(error)) {
        onPhase?.('retrying')
        await delayWithAbort(RETRY_DELAY_MS, signal)
        onPhase?.('connecting')
        continue
      }
      throw error
    }
  }

  throw new AIServiceError('HEALTH_CHECK_FAILED', 0, 'The AI service is unavailable.')
}

const requestAI = async (
  path: string,
  payload: unknown,
  signal: AbortSignal,
  onPhase?: RequestPhaseHandler,
) => {
  const health = await ensureAIHealth(signal, onPhase)
  onPhase?.('requesting')

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { response, body } = await fetchJSONWithTimeout(
        `${apiBaseUrl}${path}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        signal,
        AI_REQUEST_TIMEOUT_MS,
      )
      if (!response.ok) throw errorFromResponse(response, body)
      return body
    } catch (error) {
      const canRetry = health.aiMode === 'mock' && attempt === 0 && isTransientFailure(error)
      if (!canRetry) throw error

      onPhase?.('retrying')
      await delayWithAbort(RETRY_DELAY_MS, signal)
      onPhase?.('requesting')
    }
  }

  throw new AIServiceError('AI_REQUEST_FAILED', 0, 'The AI service is unavailable.')
}

export const analyzeWhiteboard = async ({
  message,
  elements,
  signal,
  onPhase,
}: AnalyzeWhiteboardInput): Promise<AnalyzeResponse> => {
  const body = await requestAI(
    '/api/ai/analyze',
    { message, elements: normalizeCanvasElementsForAI(elements) },
    signal,
    onPhase,
  )
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
  onPhase,
}: GenerateWhiteboardInput): Promise<GenerateResponse> => {
  const body = await requestAI(
    '/api/ai/generate',
    { message, canvas, existingElements: normalizeCanvasElementsForAI(existingElements) },
    signal,
    onPhase,
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
