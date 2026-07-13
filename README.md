# AI Whiteboard Assistant

AI Whiteboard Assistant is a student software engineering project inspired by Excalidraw. It combines a typed Konva whiteboard with a secure Express AI analysis service. The AI can describe and suggest improvements for the current board, but it cannot create, delete, or edit canvas elements.

## Technology stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Konva, and react-konva
- Backend: Node.js, Express, TypeScript, Zod, and the official OpenAI Node.js SDK
- Security: strict request validation, restricted CORS, rate limiting, body-size limits, and request timeouts
- Testing: Node test runner, Supertest, Playwright, and Playwright traces
- Persistence: versioned browser `localStorage`

## Completed features

- Pen, Rectangle, Circle, Text, Eraser, and Select tools
- Element movement, resize, rotation, deletion, and layer ordering
- Undo/Redo, keyboard shortcuts, auto-save, Save/Load, and PNG export
- Structured AI analysis with Summary, Element Counts, Observations, Suggestions, and Next Actions
- Mock mode that works without an API key
- Live mode that calls the OpenAI Responses API from the backend only
- Compact canvas summaries: long Line point arrays become bounds, point count, and approximate length
- Loading, duplicate-submit protection, Cancel, Retry, friendly errors, and Mock/Live labels

## Project structure

```text
AI-Whiteboard-Assistant/
├── frontend/
│   ├── src/components/       # Canvas, Toolbar, Transformer, and AI panel
│   ├── src/hooks/            # Canvas history, shortcuts, and auto-save
│   ├── src/services/ai.ts    # Browser-to-backend AI client
│   ├── src/types/            # Canvas and AI contracts
│   └── src/utils/            # Storage migration and validation
├── backend/
│   ├── src/routes/ai.ts      # Validated and rate-limited route
│   ├── src/services/         # Mock orchestration and OpenAI integration
│   ├── src/schemas/ai.ts     # Zod request and output schemas
│   ├── src/utils/            # Compact canvas summarization
│   └── src/app.ts            # Express security and middleware setup
└── README.md
```

## Run in Mock mode

Mock mode is the default and does not need an OpenAI API key. It is the recommended starting point for GitHub users.

```bash
cd backend
npm install
```

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Keep `AI_MOCK_MODE=true`, then start the backend:

```bash
npm run dev
```

In another terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Run in Live mode

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `AI_MOCK_MODE=false`.
3. Replace the placeholder `OPENAI_API_KEY` value with your own key.
4. Keep `OPENAI_MODEL=gpt-5.6-luna` or choose another compatible model.
5. Restart the backend.

The default model is `gpt-5.6-luna`, selected for cost-sensitive text workloads. `OPENAI_MODEL` can override it without a code change.

The API key must exist only in `backend/.env`. Never place it in frontend code, `frontend/.env`, browser storage, screenshots, issues, or commits.

The frontend normally uses `http://localhost:3001`. To change it, copy `frontend/.env.example` to `frontend/.env.local` and edit `VITE_API_BASE_URL`.

## API

### Health

```http
GET /api/health
```

The response reports service status and Mock/Live configuration state without returning the API key.

### Analyze a whiteboard

```http
POST /api/ai/analyze
Content-Type: application/json
```

```json
{
  "message": "Summarize this architecture diagram",
  "elements": []
}
```

Successful response:

```json
{
  "mode": "mock",
  "analysis": {
    "summary": "The whiteboard is currently empty.",
    "elementCounts": {
      "line": 0,
      "rectangle": 0,
      "circle": 0,
      "text": 0
    },
    "observations": ["No elements are present."],
    "suggestions": ["Add one central idea."],
    "nextActions": ["Add the first idea and analyze again."]
  }
}
```

Errors use one safe structure:

```json
{
  "error": {
    "code": "AI_REQUEST_FAILED",
    "message": "AI analysis is temporarily unavailable. Please try again later."
  }
}
```

## Build and test

```bash
cd backend
npm run typecheck
npm test
npm run build

cd ../frontend
npm run lint
npm run build
npm run test:e2e
```

## Security notes

- `backend/.env` and frontend environment overrides are ignored by Git.
- Live API calls run only on the backend; the browser never receives the key.
- Zod limits message length, element count, text length, coordinates, dimensions, and Line points.
- Express rejects JSON bodies larger than 256 KB.
- `/api/ai` is rate limited to 20 requests per 15 minutes by default.
- CORS allows only `FRONTEND_ORIGIN`.
- AI calls time out after 20 seconds by default and accept cancellation signals.
- The service does not log complete whiteboards, environment variables, request bodies, or API keys.
- Model output is validated before it is returned, and the frontend renders text without raw HTML.

## Troubleshooting

- **Backend unavailable:** start `backend` with `npm run dev` and confirm `GET http://localhost:3001/api/health` works.
- **CORS error:** make `FRONTEND_ORIGIN` exactly match the browser origin, including protocol and port.
- **Live AI not configured:** set `AI_MOCK_MODE=false` and add a valid key to `backend/.env`, then restart the backend.
- **Model access error:** change `OPENAI_MODEL` to a model available to your OpenAI project.
- **429 response:** wait for the rate-limit window before retrying.
- **Unexpected AI response:** retry once; the backend rejects malformed model output instead of returning unsafe data.

## Current scope

Authentication, databases, multiplayer collaboration, image upload, cloud persistence, and AI-driven canvas mutations remain out of scope.
