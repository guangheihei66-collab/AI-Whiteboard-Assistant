import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import type { AppConfig } from '../src/types/ai.js'

const baseConfig: AppConfig = {
  port: 3001,
  frontendOrigin: 'http://localhost:5173',
  mockMode: true,
  openAIModel: 'gpt-5.6-luna',
  openAITimeoutMs: 20_000,
  aiRateLimit: 100,
}

const rectangle = {
  id: 'rectangle-1',
  type: 'rectangle' as const,
  x: 10,
  y: 20,
  width: 100,
  height: 60,
  color: '#2563eb',
  rotation: 0,
  strokeWidth: 2,
}

describe('API security boundaries', () => {
  it('rejects missing fields, invalid element types, and oversized element arrays', async () => {
    const app = createApp({ config: baseConfig })

    await request(app).post('/api/ai/analyze').send({ elements: [] }).expect(400)
    await request(app).post('/api/ai/analyze').send({ message: 'Analyze' }).expect(400)
    await request(app)
      .post('/api/ai/analyze')
      .send({ message: 'Analyze', elements: [{ ...rectangle, type: 'image' }] })
      .expect(400)
    await request(app)
      .post('/api/ai/analyze')
      .send({
        message: 'Analyze',
        elements: Array.from({ length: 501 }, (_, index) => ({
          ...rectangle,
          id: `rectangle-${index}`,
        })),
      })
      .expect(400)
  })

  it('does not expose provider diagnostics or a stack on unexpected failures', async () => {
    const app = createApp({
      config: { ...baseConfig, mockMode: false, openAIApiKey: 'test-placeholder-key' },
      liveGenerationRunner: async () => {
        throw new Error('private provider diagnostic')
      },
    })

    const response = await request(app)
      .post('/api/ai/generate')
      .send({
        message: 'Create a flowchart',
        canvas: { width: 1200, height: 800 },
        existingElements: [],
      })
      .expect(502)

    const serialized = JSON.stringify(response.body)
    assert.equal(response.body.error.code, 'AI_GENERATION_FAILED')
    assert.doesNotMatch(serialized, /private provider diagnostic|stack/i)
  })

  it('allows only the configured origin during CORS preflight', async () => {
    const secondaryOrigin = 'https://preview.example.com'
    const app = createApp({
      config: {
        ...baseConfig,
        frontendOrigin: `${baseConfig.frontendOrigin}, ${secondaryOrigin}, invalid-origin`,
      },
    })
    const allowed = await request(app)
      .options('/api/ai/analyze')
      .set('Origin', baseConfig.frontendOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204)
    assert.equal(allowed.headers['access-control-allow-origin'], baseConfig.frontendOrigin)

    const secondary = await request(app)
      .options('/api/ai/analyze')
      .set('Origin', secondaryOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204)
    assert.equal(secondary.headers['access-control-allow-origin'], secondaryOrigin)

    const denied = await request(app)
      .options('/api/ai/analyze')
      .set('Origin', 'https://untrusted.example')
      .set('Access-Control-Request-Method', 'POST')
      .expect(200)
    assert.equal(denied.headers['access-control-allow-origin'], undefined)
  })
})
