import { z } from 'zod'
import { canvasElementSchema } from './ai.js'

export const MAX_GENERATED_ELEMENTS = 40

const containsUnsafeMarkup = (value: string) =>
  /<\/?[a-z][^>]*>|javascript\s*:/i.test(value)

const safeText = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .refine((value) => !containsUnsafeMarkup(value), 'HTML and JavaScript are not allowed.')

const temporaryId = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/)
const coordinate = z.number().finite().min(-5_000).max(5_000)
const dimension = z.number().finite().min(10).max(1_000)
const rotation = z.number().finite().min(-360).max(360)
const strokeWidth = z.number().finite().min(1).max(12)
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const generatedRectangleSchema = z.object({
  temporaryId,
  type: z.literal('rectangle'),
  x: coordinate,
  y: coordinate,
  width: dimension,
  height: dimension,
  rotation,
  stroke: color,
  strokeWidth,
})

const generatedCircleSchema = z.object({
  temporaryId,
  type: z.literal('circle'),
  x: coordinate,
  y: coordinate,
  radiusX: dimension.max(500),
  radiusY: dimension.max(500),
  rotation,
  stroke: color,
  strokeWidth,
})

const generatedTextSchema = z.object({
  temporaryId,
  type: z.literal('text'),
  x: coordinate,
  y: coordinate,
  width: dimension.max(600),
  text: safeText(160),
  fontSize: z.number().finite().min(12).max(48),
  rotation,
  fill: color,
})

const generatedLineSchema = z.object({
  temporaryId,
  type: z.literal('line'),
  points: z
    .array(coordinate)
    .min(4)
    .max(40)
    .refine((points) => points.length % 2 === 0, 'Line points must contain x/y pairs.'),
  rotation,
  stroke: color,
  strokeWidth,
})

export const generatedElementSchema = z.discriminatedUnion('type', [
  generatedRectangleSchema,
  generatedCircleSchema,
  generatedTextSchema,
  generatedLineSchema,
])

export const generatedProposalModelSchema = z
  .object({
    title: safeText(100),
    description: safeText(500),
    elements: z.array(generatedElementSchema).min(1).max(MAX_GENERATED_ELEMENTS),
  })
  .refine(
    (proposal) =>
      new Set(proposal.elements.map((element) => element.temporaryId)).size ===
      proposal.elements.length,
    'Generated temporary IDs must be unique.',
  )

export const generateRequestSchema = z.object({
  message: safeText(500),
  canvas: z.object({
    width: z.number().finite().min(320).max(4_000),
    height: z.number().finite().min(240).max(3_000),
  }),
  existingElements: z.array(canvasElementSchema).max(500),
})

export type GenerateRequest = z.infer<typeof generateRequestSchema>
export type GeneratedElementModel = z.infer<typeof generatedElementSchema>
export type GeneratedProposalModel = z.infer<typeof generatedProposalModelSchema>
