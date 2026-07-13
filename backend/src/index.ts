import cors from 'cors'
import express from 'express'
import { aiRouter } from './routes/ai.js'

const app = express()
const port = Number(process.env.PORT) || 3001

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'ai-whiteboard-assistant-backend' })
})

app.use('/api/ai', aiRouter)

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found.' })
})

app.listen(port, () => {
  console.log(`Mock AI backend listening on http://localhost:${port}`)
})
