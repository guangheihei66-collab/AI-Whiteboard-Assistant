import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { loadConfig } from './config.js'
import { getRequestId, requestContextMiddleware } from './middleware/requestContext.js'
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

const parseAllowedOrigins = (configuredOrigins: string) =>
  new Set(
    configuredOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => {
        try {
          const url = new URL(origin)
          return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin
        } catch {
          return false
        }
      }),
  )

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
        requestId: getRequestId(response),
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
  const allowedOrigins = parseAllowedOrigins(config.frontendOrigin)

  app.disable('x-powered-by')
  app.use(requestContextMiddleware)
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        callback(null, !requestOrigin || allowedOrigins.has(requestOrigin))
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['X-Request-Id', 'Retry-After'],
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
      error: { code: 'NOT_FOUND', message: 'Route not found.', requestId: getRequestId(response) },
    }
    response.status(404).json(body)
  })

  app.use(jsonErrorHandler)
  app.use(((error, request, response, _next) => {
    console.error(
      `[request-error] ${getRequestId(response) ?? 'unknown'} ${request.method} ${request.path}`,
      error instanceof Error ? error.name : 'UnknownError',
    )
    const body: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The server could not process the request.',
        requestId: getRequestId(response),
      },
    }
    if (!response.headersSent) response.status(500).json(body)
  }) satisfies ErrorRequestHandler)

  return app
}
