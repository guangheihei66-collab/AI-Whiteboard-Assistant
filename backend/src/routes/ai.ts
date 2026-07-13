import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { analyzeRequestSchema } from '../schemas/ai.js'
import { analyzeCanvas, AIServiceError } from '../services/analyzeCanvas.js'
import type { AppConfig, ErrorResponse, LiveAnalysisRunner } from '../types/ai.js'

interface AIRouterOptions {
  config: AppConfig
  liveAnalysisRunner?: LiveAnalysisRunner
}

const validationMessages = (issues: { path: PropertyKey[]; message: string }[]) =>
  issues.slice(0, 8).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'request'
    return `${path}: ${issue.message}`
  })

export const createAIRouter = ({ config, liveAnalysisRunner }: AIRouterOptions) => {
  const router = Router()

  router.use(
    rateLimit({
      windowMs: 15 * 60 * 1_000,
      limit: config.aiRateLimit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_request, response) => {
        const body: ErrorResponse = {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many AI analysis requests. Please wait and try again.',
          },
        }
        response.status(429).json(body)
      },
    }),
  )

  router.post('/analyze', async (request, response) => {
    const parsed = analyzeRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      const body: ErrorResponse = {
        error: {
          code: 'INVALID_REQUEST',
          message: 'The AI analysis request is invalid.',
          details: validationMessages(parsed.error.issues),
        },
      }
      response.status(400).json(body)
      return
    }

    const controller = new AbortController()
    request.once('aborted', () => controller.abort())
    response.once('close', () => {
      if (!response.writableEnded) controller.abort()
    })

    try {
      const result = await analyzeCanvas(parsed.data, config, controller.signal, liveAnalysisRunner)
      if (!controller.signal.aborted && !response.headersSent) response.json(result)
    } catch (error) {
      if (controller.signal.aborted || response.headersSent) return

      if (error instanceof AIServiceError) {
        const body: ErrorResponse = {
          error: { code: error.code, message: error.publicMessage },
        }
        response.status(error.status).json(body)
        return
      }

      const body: ErrorResponse = {
        error: {
          code: 'AI_REQUEST_FAILED',
          message: 'AI analysis is temporarily unavailable. Please try again later.',
        },
      }
      response.status(500).json(body)
    }
  })

  return router
}
