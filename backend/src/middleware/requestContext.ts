import { randomUUID } from 'node:crypto'
import type { RequestHandler, Response } from 'express'

const REQUEST_ID_HEADER = 'X-Request-Id'

export const requestContextMiddleware: RequestHandler = (request, response, next) => {
  const requestId = randomUUID()
  response.setHeader(REQUEST_ID_HEADER, requestId)
  const startedAt = Date.now()

  response.on('finish', () => {
    // Keep production logs useful without recording request bodies, prompts, or secrets.
    console.info(
      `[request] ${requestId} ${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms`,
    )
  })

  next()
}

export const getRequestId = (response: Response) => {
  const value = response.getHeader(REQUEST_ID_HEADER)
  return typeof value === 'string' ? value : undefined
}

