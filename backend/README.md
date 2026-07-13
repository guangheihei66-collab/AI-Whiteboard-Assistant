# AI Whiteboard Assistant Backend

This package provides a TypeScript Express service for secure whiteboard analysis and generated proposals. It supports deterministic Mock mode and a Live mode powered by the official OpenAI Node.js SDK and the Responses API.

## Setup

```bash
npm install
```

Copy the template without committing the resulting file:

```powershell
Copy-Item .env.example .env
```

Important variables:

- `AI_MOCK_MODE=true`: local analysis, no key required
- `AI_MOCK_MODE=false`: use OpenAI Live mode
- `OPENAI_API_KEY`: backend-only credential for Live mode
- `OPENAI_MODEL`: defaults to `gpt-5.6-luna`
- `FRONTEND_ORIGIN`: the one browser origin allowed by CORS
- `OPENAI_TIMEOUT_MS`: upstream request timeout, default 20000

Start the development server:

```bash
npm run dev
```

## Commands

```bash
npm run typecheck
npm test
npm run build
npm start
```

## Endpoints

- `GET /api/health`: safe service, mode, and configuration status
- `POST /api/ai/analyze`: accepts `{ "message": "...", "elements": [...] }`
- `POST /api/ai/generate`: accepts a message, canvas dimensions, and existing elements

The Generate route supports flowcharts, simple mind maps, architecture sketches, study plans, and sticky-note layouts using the existing rectangle, circle, text, and line types. Model proposals pass through Zod, receive final UUIDs, are clamped to the requested canvas, and are shifted away from existing content when space permits. Unknown fields are stripped; HTML, JavaScript, invalid colors, duplicate temporary IDs, and oversized proposals are rejected.

Both AI routes are rate limited and return fixed structures. Internal errors, stack traces, request bodies, and credentials are never returned to the browser.

Never commit `backend/.env`. A real OpenAI key belongs only in that ignored file.
