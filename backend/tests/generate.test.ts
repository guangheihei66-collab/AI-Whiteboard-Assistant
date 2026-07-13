import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { MAX_GENERATED_ELEMENTS } from '../src/schemas/generatedCanvas.js'
import type { AppConfig } from '../src/types/ai.js'

const baseConfig: AppConfig = {
  port: 3001,
  frontendOrigin: 'http://localhost:5173',
  mockMode: true,
  openAIModel: 'gpt-5.6-luna',
  openAITimeoutMs: 20_000,
  aiRateLimit: 100,
}

const payload = {
  message: 'Draw a user login flowchart',
  canvas: { width: 1200, height: 800 },
  existingElements: [],
}

const liveProposal = {
  title: 'Learning Plan',
  description: 'A simple weekly study plan.',
  elements: [
    {
      temporaryId: 'topic-1',
      type: 'rectangle',
      x: 80,
      y: 90,
      width: 220,
      height: 70,
      rotation: 0,
      stroke: '#2563eb',
      strokeWidth: 2,
    },
    {
      temporaryId: 'label-1',
      type: 'text',
      x: 100,
      y: 112,
      width: 180,
      text: 'Review TypeScript',
      fontSize: 18,
      rotation: 0,
      fill: '#111827',
    },
  ],
}

describe('AI whiteboard generation API', () => {
  it('generates a fixed login flow in mock mode with server IDs', async () => {
    const response = await request(createApp({ config: baseConfig }))
      .post('/api/ai/generate')
      .send(payload)
      .expect(200)

    assert.equal(response.body.mode, 'mock')
    assert.equal(response.body.proposal.title, 'User Login Flow')
    assert.ok(response.body.proposal.elements.length >= 8)

    const ids = response.body.proposal.elements.map((element: { id: string }) => element.id)
    assert.equal(new Set(ids).size, ids.length)
    assert.ok(ids.every((id: string) => /^[0-9a-f-]{36}$/.test(id)))
    assert.doesNotMatch(JSON.stringify(response.body), /temporaryId/)
  })

  it('returns the same proposal structure in live mode', async () => {
    const response = await request(
      createApp({
        config: { ...baseConfig, mockMode: false, openAIApiKey: 'test-placeholder-key' },
        liveGenerationRunner: async () => liveProposal,
      }),
    )
      .post('/api/ai/generate')
      .send(payload)
      .expect(200)

    assert.equal(response.body.mode, 'live')
    assert.deepEqual(Object.keys(response.body.proposal).sort(), [
      'description',
      'elements',
      'title',
    ])
    assert.deepEqual(
      Object.keys(response.body.proposal.elements[0]).sort(),
      ['color', 'height', 'id', 'rotation', 'strokeWidth', 'type', 'width', 'x', 'y'],
    )
  })

  it('clamps generated elements into the requested canvas', async () => {
    const outOfBounds = {
      title: 'Corrected layout',
      description: 'Coordinates require normalization.',
      elements: [
        {
          temporaryId: 'outside',
          type: 'rectangle',
          x: 5_000,
          y: -5_000,
          width: 1_000,
          height: 1_000,
          rotation: 360,
          stroke: '#2563eb',
          strokeWidth: 2,
          ignoredField: 'removed',
        },
      ],
      ignoredTopLevel: true,
    }
    const response = await request(
      createApp({
        config: { ...baseConfig, mockMode: false, openAIApiKey: 'test-placeholder-key' },
        liveGenerationRunner: async () => outOfBounds,
      }),
    )
      .post('/api/ai/generate')
      .send({ ...payload, canvas: { width: 600, height: 400 } })
      .expect(200)

    const element = response.body.proposal.elements[0]
    assert.ok(element.x >= 0 && element.y >= 0)
    assert.ok(element.x + element.width <= 600)
    assert.ok(element.y + element.height <= 400)
    assert.equal(element.rotation, 180)
    assert.equal(element.ignoredField, undefined)
    assert.equal(response.body.proposal.ignoredTopLevel, undefined)
  })

  it('moves a proposal below existing content when space is available', async () => {
    const response = await request(createApp({ config: baseConfig }))
      .post('/api/ai/generate')
      .send({
        ...payload,
        canvas: { width: 1200, height: 1000 },
        existingElements: [
          {
            id: 'existing',
            type: 'rectangle',
            x: 80,
            y: 40,
            width: 500,
            height: 350,
            rotation: 0,
            color: '#0f172a',
            strokeWidth: 2,
          },
        ],
      })
      .expect(200)

    const coordinates = response.body.proposal.elements.flatMap(
      (element: { type: string; y?: number; points?: number[]; radiusY?: number }) => {
        if (element.type === 'line') {
          return element.points?.filter((_point, index) => index % 2 === 1) ?? []
        }
        if (element.type === 'circle') return [(element.y ?? 0) - (element.radiusY ?? 0)]
        return [element.y ?? 0]
      },
    )
    assert.ok(Math.min(...coordinates) >= 430)
  })

  it('rejects too many generated elements', async () => {
    const oversizedProposal = {
      ...liveProposal,
      elements: Array.from({ length: MAX_GENERATED_ELEMENTS + 1 }, (_, index) => ({
        temporaryId: `node-${index}`,
        type: 'rectangle',
        x: 10,
        y: 10,
        width: 80,
        height: 40,
        rotation: 0,
        stroke: '#2563eb',
        strokeWidth: 2,
      })),
    }
    const response = await request(
      createApp({
        config: { ...baseConfig, mockMode: false, openAIApiKey: 'test-placeholder-key' },
        liveGenerationRunner: async () => oversizedProposal,
      }),
    )
      .post('/api/ai/generate')
      .send(payload)
      .expect(502)

    assert.equal(response.body.error.code, 'AI_GENERATION_INVALID')
  })

  it('rejects generated HTML and JavaScript instead of returning it', async () => {
    const unsafeProposal = {
      ...liveProposal,
      elements: [
        {
          ...liveProposal.elements[1],
          text: '<img src=x onerror=alert(1)>',
        },
      ],
    }
    const response = await request(
      createApp({
        config: { ...baseConfig, mockMode: false, openAIApiKey: 'test-placeholder-key' },
        liveGenerationRunner: async () => unsafeProposal,
      }),
    )
      .post('/api/ai/generate')
      .send(payload)
      .expect(502)

    assert.equal(response.body.error.code, 'AI_GENERATION_INVALID')
    assert.doesNotMatch(JSON.stringify(response.body), /onerror|img/)
  })

  it('rejects empty messages and malformed canvas requests', async () => {
    const app = createApp({ config: baseConfig })
    await request(app)
      .post('/api/ai/generate')
      .send({ ...payload, message: '   ' })
      .expect(400)
    await request(app)
      .post('/api/ai/generate')
      .send({ ...payload, canvas: { width: 100, height: 100 } })
      .expect(400)
  })

  it('returns a safe error when Live mode has no API key', async () => {
    const response = await request(createApp({ config: { ...baseConfig, mockMode: false } }))
      .post('/api/ai/generate')
      .send(payload)
      .expect(503)
    assert.equal(response.body.error.code, 'AI_NOT_CONFIGURED')
  })
})
