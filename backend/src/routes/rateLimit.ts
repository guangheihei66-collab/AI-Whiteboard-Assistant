import rateLimit from 'express-rate-limit'
import type { AppConfig, ErrorResponse } from '../types/ai.js'

export const createAIRateLimiter = (config: AppConfig) =>
  rateLimit({
    windowMs: 15 * 60 * 1_000,
    limit: config.aiRateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => {
      const body: ErrorResponse = {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many AI requests. Please wait and try again.',
        },
      }
      response.status(429).json(body)
    },
  })
