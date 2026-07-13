import { describe, expect, it } from 'vitest'
import { appendSampledPoint, MAX_FREEHAND_POINT_PAIRS } from './lineSampling'

describe('freehand point sampling', () => {
  it('ignores tiny pointer movements while keeping meaningful movement', () => {
    const points = [10, 10]
    expect(appendSampledPoint(points, { x: 10.5, y: 10.5 })).toBe(points)
    expect(appendSampledPoint(points, { x: 13, y: 10 })).toEqual([10, 10, 13, 10])
  })

  it('does not grow a line beyond the conservative point limit', () => {
    const points = Array.from(
      { length: MAX_FREEHAND_POINT_PAIRS * 2 },
      (_, index) => index,
    )
    expect(appendSampledPoint(points, { x: 20_000, y: 20_000 })).toBe(points)
  })
})
