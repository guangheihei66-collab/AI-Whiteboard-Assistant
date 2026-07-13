import { modelAnalysisSchema, type AnalyzeRequest } from '../schemas/ai.js'
import type {
  AIAnalysis,
  AnalyzeResponse,
  AppConfig,
  LiveAnalysisRunner,
  ModelAnalysis,
} from '../types/ai.js'
import { formatCounts, summarizeCanvas } from '../utils/summarizeCanvas.js'
import { createOpenAIAnalyzer } from './openai.js'

export class AIServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly publicMessage: string,
    options?: ErrorOptions,
  ) {
    super(publicMessage, options)
    this.name = 'AIServiceError'
  }
}

const createMockContent = (
  request: AnalyzeRequest,
  summary: ReturnType<typeof summarizeCanvas>,
): ModelAnalysis => {
  const presentTypes = formatCounts(summary.elementCounts)

  if (summary.totalElements === 0) {
    return {
      summary: 'The whiteboard is currently empty, so there is no visual structure to analyze yet.',
      observations: ['No lines, shapes, or text elements are present.'],
      suggestions: ['Start with a short title or one central idea, then add supporting shapes.'],
      nextActions: ['Add the first idea to the board and analyze it again.'],
    }
  }

  return {
    summary: `The whiteboard contains ${summary.totalElements} elements: ${presentTypes}.`,
    observations: [
      `The request asks: “${request.message.slice(0, 120)}”`,
      summary.elementCounts.text > 0
        ? 'Text labels are available to explain part of the board.'
        : 'The board has no text labels yet.',
    ],
    suggestions: [
      'Keep related shapes close together and use consistent colors for related ideas.',
      summary.elementCounts.text > 0
        ? 'Check that each label clearly describes the shape or line beside it.'
        : 'Add concise labels for the main ideas.',
    ],
    nextActions: ['Name the main idea, group related elements, and review the visual hierarchy.'],
  }
}

const normalizeModelContent = (value: unknown): ModelAnalysis => {
  const parsed = modelAnalysisSchema.safeParse(value)
  if (!parsed.success) {
    throw new AIServiceError(
      'AI_RESPONSE_INVALID',
      502,
      'AI returned an unexpected response. Please try again.',
    )
  }
  return parsed.data
}

const isAbortError = (error: unknown) =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'APIUserAbortError')

const isTimeoutError = (error: unknown) =>
  error instanceof Error && error.name === 'APIConnectionTimeoutError'

export const analyzeCanvas = async (
  request: AnalyzeRequest,
  config: AppConfig,
  signal: AbortSignal,
  injectedLiveRunner?: LiveAnalysisRunner,
): Promise<AnalyzeResponse> => {
  const canvas = summarizeCanvas(request.elements)
  const counts = canvas.elementCounts

  if (config.mockMode) {
    return {
      mode: 'mock',
      analysis: { ...createMockContent(request, canvas), elementCounts: counts },
    }
  }

  if (!config.openAIApiKey) {
    throw new AIServiceError(
      'AI_NOT_CONFIGURED',
      503,
      'Live AI is not configured. Check the backend environment variables.',
    )
  }

  const liveRunner = injectedLiveRunner ?? createOpenAIAnalyzer(config)

  try {
    const rawResult = await liveRunner({
      message: request.message,
      canvasSummary: JSON.stringify(canvas),
      signal,
    })
    const content = normalizeModelContent(rawResult)
    const analysis: AIAnalysis = { ...content, elementCounts: counts }
    return { mode: 'live', analysis }
  } catch (error) {
    if (error instanceof AIServiceError) throw error
    if (isAbortError(error) || signal.aborted) {
      throw new AIServiceError('AI_REQUEST_CANCELLED', 499, 'AI analysis was cancelled.', {
        cause: error,
      })
    }
    if (isTimeoutError(error)) {
      throw new AIServiceError(
        'AI_REQUEST_TIMEOUT',
        504,
        'AI analysis timed out. Please try again.',
        { cause: error },
      )
    }
    throw new AIServiceError(
      'AI_REQUEST_FAILED',
      502,
      'AI analysis is temporarily unavailable. Please try again later.',
      { cause: error },
    )
  }
}
