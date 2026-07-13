import { useEffect } from 'react'
import type { CanvasElement } from '../types/canvas'
import { saveCanvasToStorage } from '../utils/storage'

export function useAutoSave(elements: CanvasElement[], delay = 500) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      saveCanvasToStorage(elements)
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [delay, elements])
}
