import { z } from 'zod'

const coordinateSchema = z.number().finite().min(-1_000_000).max(1_000_000)
const dimensionSchema = z.number().finite().min(0).max(1_000_000)
const rotationSchema = z.number().finite().min(-360_000).max(360_000)
const colorSchema = z.string().trim().min(1).max(32)
const idSchema = z.string().trim().min(1).max(100)
const strokeWidthSchema = z.number().finite().min(0.1).max(100)

const baseShape = {
  id: idSchema,
  color: colorSchema,
  rotation: rotationSchema,
}

const lineSchema = z
  .object({
    ...baseShape,
    type: z.literal('line'),
    points: z
      .array(coordinateSchema)
      // A Pen press without movement is persisted as one x/y pair by the canvas.
      // It is a valid (degenerate) element for analysis and must not invalidate the board.
      .min(2)
      .max(20_000)
      .refine((points) => points.length % 2 === 0, 'Line points must contain x/y pairs.'),
    strokeWidth: strokeWidthSchema,
  })
  .strict()

const rectangleSchema = z
  .object({
    ...baseShape,
    type: z.literal('rectangle'),
    x: coordinateSchema,
    y: coordinateSchema,
    width: dimensionSchema,
    height: dimensionSchema,
    strokeWidth: strokeWidthSchema,
  })
  .strict()

const circleSchema = z
  .object({
    ...baseShape,
    type: z.literal('circle'),
    x: coordinateSchema,
    y: coordinateSchema,
    radiusX: dimensionSchema,
    radiusY: dimensionSchema,
    strokeWidth: strokeWidthSchema,
  })
  .strict()

const textSchema = z
  .object({
    ...baseShape,
    type: z.literal('text'),
    x: coordinateSchema,
    y: coordinateSchema,
    text: z.string().max(2_000),
    width: dimensionSchema,
    fontSize: z.number().finite().min(1).max(1_000),
  })
  .strict()

export const canvasElementSchema = z.discriminatedUnion('type', [
  lineSchema,
  rectangleSchema,
  circleSchema,
  textSchema,
])

export const analyzeRequestSchema = z
  .object({
    message: z.string().trim().min(1, 'Message is required.').max(500),
    elements: z.array(canvasElementSchema).max(500),
  })
  .strict()

const noHtml = (value: string) => !/<\/?[a-z][^>]*>/i.test(value)
const safeOutputSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(noHtml, 'HTML is not allowed in AI output.')
const safeListSchema = z.array(safeOutputSchema).max(8)

export const modelAnalysisSchema = z
  .object({
    summary: z
      .string()
      .trim()
      .min(1)
      .max(2_000)
      .refine(noHtml, 'HTML is not allowed in AI output.'),
    observations: safeListSchema,
    suggestions: safeListSchema,
    nextActions: safeListSchema,
  })
  .strict()

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>
export type CanvasElement = z.infer<typeof canvasElementSchema>
