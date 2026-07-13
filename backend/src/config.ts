import 'dotenv/config'
import type { AppConfig } from './types/ai.js'

const DEFAULT_MODEL = 'gpt-5.6-luna'

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback
  return value.trim().toLowerCase() === 'true'
}

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): AppConfig => ({
  port: parsePositiveInteger(environment.PORT, 3001),
  frontendOrigin: environment.FRONTEND_ORIGIN?.trim() || 'http://localhost:5173',
  mockMode: parseBoolean(environment.AI_MOCK_MODE, true),
  openAIApiKey: environment.OPENAI_API_KEY?.trim() || undefined,
  openAIModel: environment.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
  openAITimeoutMs: parsePositiveInteger(environment.OPENAI_TIMEOUT_MS, 20_000),
  aiRateLimit: parsePositiveInteger(environment.AI_RATE_LIMIT, 20),
})
