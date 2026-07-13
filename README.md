# AI Whiteboard Assistant

AI Whiteboard Assistant is a student software engineering project inspired by Excalidraw. It combines a typed Konva whiteboard with a secure Express AI service. AI can analyze the current board or propose new content, but a proposal never changes the canvas until the user previews and explicitly applies it.

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
- AI proposals for flowcharts, simple mind maps, architecture sketches, study plans, and sticky-note layouts
- Mandatory Generate → Validate → Preview → Confirm → Apply workflow
- Dashed, translucent canvas previews that are excluded from Save, auto-save, history, and PNG export
- One-step batch Apply, Undo, and Redo for generated proposals
- Mock mode that works without an API key
- Live mode that calls the OpenAI Responses API from the backend only
- Compact canvas summaries: long Line point arrays become bounds, point count, and approximate length
- Loading, duplicate-submit protection, Cancel, Retry, friendly errors, and Mock/Live labels

## Project structure

```text
AI-Whiteboard-Assistant/
├── frontend/
│   ├── src/components/       # Canvas, Toolbar, Transformer, AI panel, and preview overlay
│   ├── src/hooks/            # Canvas history, shortcuts, and auto-save
│   ├── src/services/ai.ts    # Browser-to-backend AI client
│   ├── src/types/            # Canvas, analysis, and proposal contracts
│   └── src/utils/            # Storage, proposal normalization, and validation
├── backend/
│   ├── src/routes/           # Analyze and Generate routes with rate limiting
│   ├── src/services/         # Analysis, generation, layout, and OpenAI integration
│   ├── src/schemas/          # Zod analysis and generated-canvas schemas
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

### Generate a whiteboard proposal

```http
POST /api/ai/generate
Content-Type: application/json
```

```json
{
  "message": "Create a user login flowchart",
  "canvas": { "width": 1200, "height": 800 },
  "existingElements": []
}
```

The response contains `mode` and a validated `proposal` with a title, description, and existing canvas element types. Mock mode returns a fixed login flow. Live mode uses the same response structure. The backend replaces temporary model identifiers with final UUIDs, clamps elements to the canvas, and tries to place the proposal away from existing content.

In the UI, open the **Generate** tab, describe the desired diagram, and select **Generate Whiteboard**. Review the dashed preview, then choose **Apply to Canvas**, **Regenerate**, or **Cancel Preview**. Applying the complete proposal creates exactly one history entry.

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
- Generated proposals are limited to 40 rectangle, circle, text, or line elements.
- HTML, JavaScript, invalid colors, duplicate temporary IDs, and unknown element types are rejected.
- The frontend validates and rebuilds generated elements again before displaying a preview.
- Express rejects JSON bodies larger than 256 KB.
- `/api/ai` is rate limited to 20 requests per 15 minutes by default.
- CORS allows only `FRONTEND_ORIGIN`.
- AI calls time out after 20 seconds by default and accept cancellation signals.
- The service does not log complete whiteboards, environment variables, request bodies, or API keys.
- Model output is validated before it is returned; neither frontend path uses raw HTML rendering.

## Troubleshooting

- **Backend unavailable:** start `backend` with `npm run dev` and confirm `GET http://localhost:3001/api/health` works.
- **CORS error:** make `FRONTEND_ORIGIN` exactly match the browser origin, including protocol and port.
- **Live AI not configured:** set `AI_MOCK_MODE=false` and add a valid key to `backend/.env`, then restart the backend.
- **Model access error:** change `OPENAI_MODEL` to a model available to your OpenAI project.
- **429 response:** wait for the rate-limit window before retrying.
- **Unexpected AI response:** retry once; the backend rejects malformed model output instead of returning unsafe data.

## Current scope

Authentication, databases, multiplayer collaboration, image upload, cloud persistence, advanced automatic layout, and direct AI canvas mutation remain out of scope.
