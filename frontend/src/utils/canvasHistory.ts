import type { CanvasElement } from '../types/canvas'

export const MAX_HISTORY_ENTRIES = 100

export interface CanvasHistory {
  past: CanvasElement[][]
  present: CanvasElement[]
  future: CanvasElement[][]
}

export const createCanvasHistory = (present: CanvasElement[] = []): CanvasHistory => ({
  past: [],
  present,
  future: [],
})

const appendPast = (past: CanvasElement[][], snapshot: CanvasElement[]) =>
  [...past, snapshot].slice(-MAX_HISTORY_ENTRIES)

export const commitCanvasHistory = (
  current: CanvasHistory,
  nextElements: CanvasElement[],
): CanvasHistory => {
  if (nextElements === current.present) return current
  return {
    past: appendPast(current.past, current.present),
    present: nextElements,
    future: [],
  }
}

export const undoCanvasHistory = (current: CanvasHistory): CanvasHistory => {
  const previous = current.past.at(-1)
  if (!previous) return current
  return {
    past: current.past.slice(0, -1),
    present: previous,
    future: [current.present, ...current.future].slice(0, MAX_HISTORY_ENTRIES),
  }
}

export const redoCanvasHistory = (current: CanvasHistory): CanvasHistory => {
  const next = current.future[0]
  if (!next) return current
  return {
    past: appendPast(current.past, current.present),
    present: next,
    future: current.future.slice(1),
  }
}
