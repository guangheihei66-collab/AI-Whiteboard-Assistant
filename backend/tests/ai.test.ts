import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import type { CanvasElement } from '../src/schemas/ai.js'
import type { AppConfig } from '../src/types/ai.js'
import { summarizeCanvas } from '../src/utils/summarizeCanvas.js'

const baseConfig: AppConfig = {
  port: 3001,
  frontendOrigin: 'http://localhost:5173',
  mockMode: true,
  openAIModel: 'gpt-5.6-luna',
  openAITimeoutMs: 20_000,
  aiRateLimit: 100,
}

const elements: CanvasElement[] = [
  {
    id: 'line-1',
    type: 'line',
    points: [10, 10, 20, 20, 30, 15],
    color: '#0f172a',
    rotation: 0,
    strokeWidth: 3,
  },
  {
    id: 'rectangle-1',
    type: 'rectangle',
    x: 50,
    y: 60,
    width: 120,
    height: 80,
    color: '#ef4444',
    rotation: 12,
    strokeWidth: 4,
  },
  {
    id: 'circle-1',
    type: 'circle',
    x: 220,
    y: 120,
    radiusX: 45,
    radiusY: 30,
    color: '#2563eb',
    rotation: 18,
    strokeWidth: 4,
  },
  {
    id: 'text-1',
    type: 'text',
    x: 320,
    y: 80,
    text: 'Roadmap',
    width: 140,
    fontSize: 22,
    color: '#0f172a',
    rotation: 5,
  },
]

describe('AI analysis API', () => {
  it('adds a correlation id to every response without exposing request data', async () => {
    const response = await request(createApp({ config: baseConfig }))
      .get('/api/health')
      .expect(200)

    assert.match(response.headers['x-request-id'], /^[0-9a-f-]{36}$/)
    assert.equal(response.body.status, 'ok')
  })

  it('returns a structured mock response without an API key', async () => {
    const response = await request(createApp({ config: baseConfig }))
      .post('/api/ai/analyze')
      .send({ message: 'Analyze this board', elements })
      .expect(200)

    assert.equal(response.body.mode, 'mock')
    assert.deepEqual(response.body.analysis.elementCounts, {
      line: 1,
      rectangle: 1,
      circle: 1,
      text: 1,
    })
    assert.ok(Array.isArray(response.body.analysis.nextActions))
  })

  it('allows an empty whiteboard', async () => {
    const response = await request(createApp({ config: baseConfig }))
      .post('/api/ai/analyze')
      .send({ message: 'What should I add first?', elements: [] })
      .expect(200)

    assert.equal(response.body.analysis.elementCounts.line, 0)
    assert.match(response.body.analysis.summary, /empty/i)
  })

  it('accepts a persisted pen press with one point pair', async () => {
    const response = await request(createApp({ config: baseConfig }))
      .post('/api/ai/analyze')
      .send({
        message: 'Analyze this board',
        elements: [
          {
            id: 'single-point-line',
            type: 'line',
            points: [40, 50],
            color: '#0f172a',
            rotation: 0,
            strokeWidth: 3,
          },
        ],
      })
      .expect(200)

    assert.equal(response.body.analysis.elementCounts.line, 1)
  })

  it('identifies a likely board type and reports concrete structural issues', async () => {
    const response = await request(createApp({ config: baseConfig }))
      .post('/api/ai/analyze')
      .send({
        message: 'Review this user login flow',
        elements: [
          {
            id: 'tiny-step',
            type: 'rectangle',
            x: 20,
            y: 20,
            width: 4,
            height: 6,
            color: '#2563eb',
            rotation: 0,
            strokeWidth: 2,
          },
          {
            id: 'unfinished-connector',
            type: 'line',
            points: [40, 40],
            color: '#0f172a',
            rotation: 0,
            strokeWidth: 2,
          },
        ],
      })
      .expect(200)

    assert.match(response.body.analysis.summary, /user login flow/i)
    assert.ok(response.body.analysis.observations.some((item: string) => /Rectangle 1/.test(item)))
    assert.ok(response.body.analysis.observations.some((item: string) => /Line 2/.test(item)))
  })

  it('rejects empty, oversized, and invalid requests', async () => {
    const app = createApp({ config: baseConfig })

    const emptyMessage = await request(app)
      .post('/api/ai/analyze')
      .send({ message: '   ', elements: [] })
      .expect(400)
    assert.equal(emptyMessage.body.error.code, 'INVALID_REQUEST')

    await request(app)
      .post('/api/ai/analyze')
      .send({ message: 'a'.repeat(501), elements: [] })
      .expect(400)

    await request(app)
      .post('/api/ai/analyze')
      .send({ message: 'Analyze', elements: [{ type: 'unknown' }] })
      .expect(400)

    const tooLarge = await request(app)
      .post('/api/ai/analyze')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ message: 'Analyze', elements: [], padding: 'x'.repeat(270_000) }))
      .expect(413)
    assert.equal(tooLarge.body.error.code, 'REQUEST_TOO_LARGE')
  })

  it('returns a safe configuration error in live mode without a key', async () => {
    const response = await request(
      createApp({ config: { ...baseConfig, mockMode: false } }),
    )
      .post('/api/ai/analyze')
      .send({ message: 'Analyze this board', elements: [] })
      .expect(503)

    assert.equal(response.body.error.code, 'AI_NOT_CONFIGURED')
    assert.equal(
      response.body.error.message,
      'Live AI is not configured. Check the backend environment variables.',
    )
    assert.match(response.body.error.requestId, /^[0-9a-f-]{36}$/)
  })

  it('uses the live analysis runner while keeping server-computed counts', async () => {
    let receivedSummary = ''
    const app = createApp({
      config: { ...baseConfig, mockMode: false, openAIApiKey: 'test-placeholder-key' },
      liveAnalysisRunner: async ({ canvasSummary }) => {
        receivedSummary = canvasSummary
        return {
          summary: 'A compact roadmap is shown.',
          observations: ['The board mixes labels and shapes.'],
          suggestions: ['Clarify the main flow.'],
          nextActions: ['Add arrows between related items.'],
        }
      },
    })

    const response = await request(app)
      .post('/api/ai/analyze')
      .send({ message: 'Analyze this board', elements })
      .expect(200)

    assert.equal(response.body.mode, 'live')
    assert.equal(response.body.analysis.elementCounts.text, 1)
    assert.doesNotMatch(receivedSummary, /"points"/)
  })

  it('maps an upstream timeout to a safe 504 response', async () => {
    const timeoutError = new Error('private upstream timeout details')
    timeoutError.name = 'APIConnectionTimeoutError'
    const app = createApp({
      config: { ...baseConfig, mockMode: false, openAIApiKey: 'test-placeholder-key' },
      liveAnalysisRunner: async () => {
        throw timeoutError
      },
    })

    const response = await request(app)
      .post('/api/ai/analyze')
      .send({ message: 'Analyze this board', elements: [] })
      .expect(504)

    assert.equal(response.body.error.code, 'AI_REQUEST_TIMEOUT')
    assert.doesNotMatch(JSON.stringify(response.body), /private upstream/)
  })

  it('normalizes invalid AI output to a safe error and keeps the server healthy', async () => {
    const app = createApp({
      config: { ...baseConfig, mockMode: false, openAIApiKey: 'test-placeholder-key' },
      liveAnalysisRunner: async () => ({
        summary: '<script>alert(1)</script>',
        observations: [],
        suggestions: [],
        nextActions: [],
      }),
    })

    const response = await request(app)
      .post('/api/ai/analyze')
      .send({ message: 'Analyze this board', elements })
      .expect(502)
    assert.equal(response.body.error.code, 'AI_RESPONSE_INVALID')
    assert.doesNotMatch(JSON.stringify(response.body), /script/)

    await request(app).get('/api/health').expect(200)
  })

  it('summarizes long freehand lines without forwarding raw points', () => {
    const points = Array.from({ length: 10_000 }, (_, index) => index % 2 === 0 ? index / 2 : index / 4)
    const summary = summarizeCanvas([
      {
        id: 'long-line',
        type: 'line',
        points,
        color: '#111827',
        rotation: 0,
        strokeWidth: 2,
      },
    ])
    const serialized = JSON.stringify(summary)

    assert.doesNotMatch(serialized, /"points"/)
    assert.match(serialized, /"pointCount":5000/)
    assert.ok(serialized.length < 1_000)
  })

  it('rate limits repeated AI requests with a unified error', async () => {
    const app = createApp({ config: { ...baseConfig, aiRateLimit: 1 } })
    const payload = { message: 'Analyze', elements: [] }

    await request(app).post('/api/ai/analyze').send(payload).expect(200)
    const response = await request(app).post('/api/ai/analyze').send(payload).expect(429)
    assert.equal(response.body.error.code, 'RATE_LIMITED')
  })

  it('restricts CORS and reports health without exposing credentials', async () => {
    const config = { ...baseConfig, openAIApiKey: 'test-placeholder-key' }
    const app = createApp({ config })

    const allowed = await request(app)
      .get('/api/health')
      .set('Origin', config.frontendOrigin)
      .expect(200)
    assert.equal(allowed.headers['access-control-allow-origin'], config.frontendOrigin)
    assert.doesNotMatch(JSON.stringify(allowed.body), /test-placeholder-key/)

    const denied = await request(app)
      .get('/api/health')
      .set('Origin', 'https://untrusted.example')
      .expect(200)
    assert.equal(denied.headers['access-control-allow-origin'], undefined)
  })
})
