import { Router } from 'express'
import { generateRequestSchema } from '../schemas/generatedCanvas.js'
import { AIServiceError } from '../services/analyzeCanvas.js'
import { generateWhiteboard } from '../services/generateWhiteboard.js'
import type { AppConfig, ErrorResponse, LiveGenerationRunner } from '../types/ai.js'
import { createAIRateLimiter } from './rateLimit.js'

interface GenerateRouterOptions {
  config: AppConfig
  liveGenerationRunner?: LiveGenerationRunner
}

export const createGenerateRouter = ({ config, liveGenerationRunner }: GenerateRouterOptions) => {
  const router = Router()
  router.use(createAIRateLimiter(config))

  router.post('/generate', async (request, response) => {
    const parsed = generateRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      const body: ErrorResponse = {
        error: {
          code: 'INVALID_REQUEST',
          message: 'The whiteboard generation request is invalid.',
          details: parsed.error.issues.slice(0, 8).map((issue) => {
            const path = issue.path.length > 0 ? issue.path.join('.') : 'request'
            return `${path}: ${issue.message}`
          }),
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
      const result = await generateWhiteboard(
        parsed.data,
        config,
        controller.signal,
        liveGenerationRunner,
      )
      if (!controller.signal.aborted && !response.headersSent) response.json(result)
    } catch (error) {
      if (controller.signal.aborted || response.headersSent) return
      const serviceError =
        error instanceof AIServiceError
          ? error
          : new AIServiceError(
              'AI_GENERATION_FAILED',
              500,
              'AI generation is temporarily unavailable. Please try again later.',
            )
      const body: ErrorResponse = {
        error: { code: serviceError.code, message: serviceError.publicMessage },
      }
      response.status(serviceError.status).json(body)
    }
  })

  return router
}
