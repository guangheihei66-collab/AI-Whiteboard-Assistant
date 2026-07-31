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

type CanvasSummary = ReturnType<typeof summarizeCanvas>
type SummaryElement = CanvasSummary['elements'][number]

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const elementBounds = (element: SummaryElement): Bounds | null => {
  switch (element.type) {
    case 'line':
      return {
        minX: element.bounds.x,
        minY: element.bounds.y,
        maxX: element.bounds.x + element.bounds.width,
        maxY: element.bounds.y + element.bounds.height,
      }
    case 'rectangle':
      return {
        minX: element.x,
        minY: element.y,
        maxX: element.x + element.width,
        maxY: element.y + element.height,
      }
    case 'circle':
      return {
        minX: element.x - element.radiusX,
        minY: element.y - element.radiusY,
        maxX: element.x + element.radiusX,
        maxY: element.y + element.radiusY,
      }
    case 'text':
      return {
        minX: element.x,
        minY: element.y,
        maxX: element.x + element.width,
        maxY: element.y + element.fontSize * 1.4,
      }
  }
}

const overlaps = (first: Bounds, second: Bounds) =>
  !(
    first.maxX < second.minX ||
    second.maxX < first.minX ||
    first.maxY < second.minY ||
    second.maxY < first.minY
  )

const inferBoardDescription = (request: AnalyzeRequest, summary: CanvasSummary) => {
  const text = summary.elements
    .filter((element): element is Extract<SummaryElement, { type: 'text' }> => element.type === 'text')
    .map((element) => element.text)
    .join(' ')
  const haystack = `${request.message} ${text}`.toLowerCase()

  if (/login|sign in|password|account|登录|账号|密码/.test(haystack)) return 'a user login flow'
  if (/flow|process|流程|步骤|审批/.test(haystack)) return 'a process or flow diagram'
  if (/architecture|system|service|架构|系统|服务/.test(haystack)) return 'a system architecture sketch'
  if (/mind ?map|concept|思维|脑图|概念/.test(haystack)) return 'a concept map or mind map'
  if (/study|learning|plan|学习|计划|课程/.test(haystack)) return 'a study or planning board'
  if (summary.elementCounts.rectangle >= 2 && summary.elementCounts.line >= 1) {
    return 'a process or flow diagram'
  }
  if (summary.elementCounts.text > 0 && summary.elementCounts.circle > 0) {
    return 'a labeled concept sketch'
  }
  if (summary.elementCounts.rectangle > 0 && summary.elementCounts.line > 0) {
    return 'a labeled diagram'
  }
  return 'a whiteboard sketch'
}

const findSpecificIssues = (summary: CanvasSummary) => {
  const issues: string[] = []

  for (const element of summary.elements) {
    const layer = element.layer + 1
    if (element.type === 'line' && element.pointCount < 2) {
      issues.push(`Line ${layer} has only one point pair, so it cannot show a connection or direction.`)
    }
    if (element.type === 'rectangle' && (element.width < 10 || element.height < 10)) {
      issues.push(`Rectangle ${layer} is nearly invisible (${element.width}×${element.height}).`)
    }
    if (element.type === 'circle' && (element.radiusX < 10 || element.radiusY < 10)) {
      issues.push(`Circle ${layer} is very small and may be difficult to read.`)
    }
    if (element.type === 'text' && element.text.trim().length === 0) {
      issues.push(`Text ${layer} is empty and does not explain a board element.`)
    }
  }

  const comparable = summary.elements
    .map((element) => ({ element, bounds: elementBounds(element) }))
    .filter((item): item is { element: SummaryElement; bounds: Bounds } => item.bounds !== null)
  for (let firstIndex = 0; firstIndex < comparable.length && issues.length < 8; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < comparable.length; secondIndex += 1) {
      const first = comparable[firstIndex]
      const second = comparable[secondIndex]
      if (!first || !second) continue
      if (first.element.type === 'text' || second.element.type === 'text') continue
      if (overlaps(first.bounds, second.bounds)) {
        issues.push(
          `Layers ${first.element.layer + 1} and ${second.element.layer + 1} overlap; check whether the relationship is intentional.`,
        )
      }
      if (issues.length >= 8) break
    }
  }

  return issues.slice(0, 8)
}

const createMockContent = (
  request: AnalyzeRequest,
  summary: CanvasSummary,
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

  const description = inferBoardDescription(request, summary)
  const issues = findSpecificIssues(summary)

  return {
    summary: `The board appears to be ${description}. It contains ${summary.totalElements} elements: ${presentTypes}.`,
    observations: [
      `Based on the available shapes, lines, and labels, this is likely ${description}.`,
      summary.elementCounts.text > 0
        ? 'Text labels are available to explain part of the board.'
        : 'The board has no text labels, so its meaning is less certain.',
      ...(issues.length > 0 ? issues.slice(0, 4) : ['No obvious structural errors were found in the saved elements.']),
    ],
    suggestions: [
      ...(issues.length > 0
        ? issues.slice(0, 4).map((issue) => `Review this issue: ${issue}`)
        : ['Keep related shapes close together and use consistent colors for related ideas.']),
      summary.elementCounts.text > 0
        ? 'Check that each label clearly describes the shape or line beside it.'
        : 'Add concise labels so the intended meaning can be identified more reliably.',
    ],
    nextActions: [
      ...(issues.length > 0 ? issues.slice(0, 3).map((issue) => `Fix or confirm: ${issue}`) : []),
      'Name the main idea, group related elements, and review the visual hierarchy.',
    ],
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
