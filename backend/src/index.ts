import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = createApp({ config })

const server = app.listen(config.port, '0.0.0.0', () => {
  const mode = config.mockMode ? 'mock' : 'live'
  console.log(`AI Whiteboard backend listening on http://localhost:${config.port} (${mode} mode)`)
})

const shutdown = (signal: string) => {
  console.log(`Received ${signal}; shutting down gracefully.`)
  server.close((error) => {
    if (error) {
      console.error('Graceful shutdown failed.')
      process.exitCode = 1
      return
    }
    process.exitCode = 0
  })
  setTimeout(() => {
    console.error('Graceful shutdown timed out.')
    process.exitCode = 1
    server.close()
  }, 10_000).unref()
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
