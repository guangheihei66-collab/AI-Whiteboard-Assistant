import { describe, expect, it } from 'vitest'
import { resolveAPIBaseUrl } from './ai'

describe('AI API configuration', () => {
  it('normalizes an explicitly configured backend URL', () => {
    expect(resolveAPIBaseUrl(' https://api.example.com/ ', false)).toBe(
      'https://api.example.com',
    )
  })

  it('uses localhost only in development and rejects a missing production URL', () => {
    expect(resolveAPIBaseUrl(undefined, true)).toBe('http://localhost:3001')
    expect(resolveAPIBaseUrl(undefined, false)).toBe('')
  })
})
