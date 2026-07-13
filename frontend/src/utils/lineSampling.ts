import type { Point } from '../types/canvas'

export const MAX_FREEHAND_POINT_PAIRS = 5_000
const MIN_POINT_DISTANCE_SQUARED = 2.25

export const appendSampledPoint = (points: number[], point: Point) => {
  if (points.length >= MAX_FREEHAND_POINT_PAIRS * 2) return points

  const lastX = points.at(-2)
  const lastY = points.at(-1)
  if (lastX !== undefined && lastY !== undefined) {
    const deltaX = point.x - lastX
    const deltaY = point.y - lastY
    if (deltaX * deltaX + deltaY * deltaY < MIN_POINT_DISTANCE_SQUARED) return points
  }

  return [...points, point.x, point.y]
}
