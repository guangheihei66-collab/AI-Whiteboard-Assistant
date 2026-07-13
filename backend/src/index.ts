import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = createApp({ config })

app.listen(config.port, () => {
  const mode = config.mockMode ? 'mock' : 'live'
  console.log(`AI Whiteboard backend listening on http://localhost:${config.port} (${mode} mode)`)
})
