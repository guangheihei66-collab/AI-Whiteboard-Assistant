import { Router } from 'express'

const aiRouter = Router()

const supportedTypes = ['line', 'rectangle', 'circle', 'text'] as const
type SupportedType = (typeof supportedTypes)[number]

interface CanvasElementLike {
  type?: unknown
}

const createEmptyCounts = (): Record<SupportedType, number> => ({
  line: 0,
  rectangle: 0,
  circle: 0,
  text: 0,
})

aiRouter.post('/analyze', (request, response) => {
  const elements: unknown = request.body?.elements

  if (!Array.isArray(elements)) {
    response.status(400).json({ error: 'Request body must include an elements array.' })
    return
  }

  const counts = createEmptyCounts()
  for (const element of elements as CanvasElementLike[]) {
    if (
      element &&
      typeof element === 'object' &&
      typeof element.type === 'string' &&
      supportedTypes.includes(element.type as SupportedType)
    ) {
      counts[element.type as SupportedType] += 1
    }
  }

  const suggestions = []
  if (elements.length === 0) {
    suggestions.push('Add a few shapes or notes before asking for a detailed analysis.')
  } else {
    suggestions.push('Group related shapes close together to make the board easier to scan.')
    if (counts.text === 0) {
      suggestions.push('Add text labels to explain the most important ideas.')
    } else {
      suggestions.push('Use consistent colors to connect labels with their related shapes.')
    }
  }

  response.json({
    analysis: {
      totalElements: elements.length,
      counts,
      summary: `The whiteboard contains ${elements.length} element${elements.length === 1 ? '' : 's'}.`,
      suggestions,
    },
  })
})

export { aiRouter }
