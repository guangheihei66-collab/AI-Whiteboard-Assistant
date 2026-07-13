import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { loadConfig } from './config.js'
import { createAIRouter } from './routes/ai.js'
import { createGenerateRouter } from './routes/generate.js'
import type {
  AppConfig,
  ErrorResponse,
  LiveAnalysisRunner,
  LiveGenerationRunner,
} from './types/ai.js'

interface CreateAppOptions {
  config?: AppConfig
  liveAnalysisRunner?: LiveAnalysisRunner
  liveGenerationRunner?: LiveGenerationRunner
}

const jsonErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  const status =
    typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
      ? error.status
      : undefined

  if (error instanceof SyntaxError || status === 413) {
    const responseStatus = status ?? 400
    const isTooLarge = responseStatus === 413
    const body: ErrorResponse = {
      error: {
        code: isTooLarge ? 'REQUEST_TOO_LARGE' : 'INVALID_JSON',
        message: isTooLarge
          ? 'The request body is too large.'
          : 'The request body must contain valid JSON.',
      },
    }
    response.status(responseStatus).json(body)
    return
  }
  next(error)
}

export const createApp = (options: CreateAppOptions = {}) => {
  const config = options.config ?? loadConfig()
  const app = express()

  app.disable('x-powered-by')
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        callback(null, !requestOrigin || requestOrigin === config.frontendOrigin)
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
    }),
  )
  app.use(express.json({ limit: '256kb' }))

  app.get('/api/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'ai-whiteboard-assistant-backend',
      aiMode: config.mockMode ? 'mock' : 'live',
      aiConfigured: config.mockMode || Boolean(config.openAIApiKey),
    })
  })

  app.use(
    '/api/ai',
    createAIRouter({ config, liveAnalysisRunner: options.liveAnalysisRunner }),
  )
  app.use(
    '/api/ai',
    createGenerateRouter({ config, liveGenerationRunner: options.liveGenerationRunner }),
  )

  app.use((_request, response) => {
    const body: ErrorResponse = {
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    }
    response.status(404).json(body)
  })

  app.use(jsonErrorHandler)
  app.use(((error, _request, response, _next) => {
    const body: ErrorResponse = {
      error: { code: 'INTERNAL_ERROR', message: 'The server could not process the request.' },
    }
    if (!response.headersSent) response.status(500).json(body)
  }) satisfies ErrorRequestHandler)

  return app
}
