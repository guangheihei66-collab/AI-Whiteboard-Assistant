import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AIServiceError,
  analyzeWhiteboard,
  clearAIHealthCache,
  resolveAPIBaseUrl,
} from './ai'

const healthBody = (mode: 'mock' | 'live' = 'mock') => ({
  status: 'ok',
  service: 'ai-whiteboard-assistant-backend',
  aiMode: mode,
  aiConfigured: true,
})

const analysisBody = (mode: 'mock' | 'live' = 'mock') => ({
  mode,
  analysis: {
    summary: 'Canvas summary',
    elementCounts: { line: 0, rectangle: 0, circle: 0, text: 0 },
    observations: [],
    suggestions: [],
    nextActions: [],
  },
})

const jsonResponse = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  }) as Response

const analyze = (signal = new AbortController().signal, onPhase = vi.fn()) =>
  analyzeWhiteboard({ message: 'Analyze this board', elements: [], signal, onPhase })

beforeEach(() => {
  clearAIHealthCache()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('AI API configuration', () => {
  it('normalizes an explicitly configured backend URL', () => {
    expect(resolveAPIBaseUrl(' https://api.example.com/ ', false)).toBe(
      'https://api.example.com',
    )
  })

  it('uses localhost only in development and rejects a missing production URL', () => {
    expect(resolveAPIBaseUrl(undefined, true)).toBe('http://localhost:3001')
    expect(resolveAPIBaseUrl(undefined, false)).toBe('')
  })
})

describe('AI request reliability', () => {
  it('warms the backend before analysis and reports request phases', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(healthBody()))
      .mockResolvedValueOnce(jsonResponse(analysisBody()))
    vi.stubGlobal('fetch', fetchMock)
    const onPhase = vi.fn()

    await expect(analyze(new AbortController().signal, onPhase)).resolves.toMatchObject({
      mode: 'mock',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/health')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:3001/api/ai/analyze')
    expect(onPhase.mock.calls.map(([phase]) => phase)).toEqual(['connecting', 'requesting'])
  })

  it('caches a successful health check briefly', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(healthBody()))
      .mockResolvedValueOnce(jsonResponse(analysisBody()))
      .mockResolvedValueOnce(jsonResponse(analysisBody()))
    vi.stubGlobal('fetch', fetchMock)

    await analyze()
    await analyze()

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('retries a transient health network failure once', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('cold start disconnected'))
      .mockResolvedValueOnce(jsonResponse(healthBody()))
      .mockResolvedValueOnce(jsonResponse(analysisBody()))
    vi.stubGlobal('fetch', fetchMock)
    const onPhase = vi.fn()

    const request = analyze(new AbortController().signal, onPhase)
    await vi.advanceTimersByTimeAsync(750)
    await expect(request).resolves.toMatchObject({ mode: 'mock' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(onPhase.mock.calls.map(([phase]) => phase)).toEqual([
      'connecting',
      'retrying',
      'connecting',
      'requesting',
    ])
  })

  it('retries one transient Mock request and then succeeds', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(healthBody('mock')))
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: 'TEMPORARY', message: 'Waking up.' } }, 503),
      )
      .mockResolvedValueOnce(jsonResponse(analysisBody('mock')))
    vi.stubGlobal('fetch', fetchMock)
    const onPhase = vi.fn()

    const request = analyze(new AbortController().signal, onPhase)
    await vi.advanceTimersByTimeAsync(750)
    await expect(request).resolves.toMatchObject({ mode: 'mock' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(onPhase.mock.calls.map(([phase]) => phase)).toEqual([
      'connecting',
      'requesting',
      'retrying',
      'requesting',
    ])
  })

  it('does not automatically retry a Live request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(healthBody('live')))
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: 'UPSTREAM_ERROR', message: 'Provider unavailable.' } }, 503),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(analyze()).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      status: 503,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('preserves rate-limit diagnostics without retrying', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(healthBody('mock')))
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
          429,
          { 'Retry-After': '42', 'X-Request-Id': 'request-123' },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const error = await analyze().catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(AIServiceError)
    expect(error).toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retryAfterSeconds: 42,
      requestId: 'request-123',
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports request timeout separately from cancellation', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(healthBody('mock')))
      .mockImplementationOnce((_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('timed out')
            error.name = 'AbortError'
            reject(error)
          })
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const request = analyze()
    const expectation = expect(request).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' })
    await vi.advanceTimersByTimeAsync(35_000)
    await expectation
  })

  it('aborts an in-progress health check without retrying', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const request = analyze(controller.signal)
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
