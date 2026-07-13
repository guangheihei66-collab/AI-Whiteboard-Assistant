# Architecture

## Frontend

React composes the Toolbar, Konva Canvas, selection Transformer, AI Panel, and Error Boundary. `useCanvas` coordinates tools, element state, selection, bounded history, persistence, export, and batch proposal application. Pure utilities validate storage, normalize generated elements, sample freehand points, and transition history.

The current canvas is automatically saved as a versioned localStorage document. AI preview elements remain separate from formal elements, history, Save, autosave, and PNG export until Apply.

## Backend

Express exposes `/api/health`, `/api/ai/analyze`, and `/api/ai/generate`. Zod validates request data and Live model output. Rate limits, request-size limits, timeouts, cancellation, strict CORS origins, and safe error bodies form the API boundary.

Mock mode returns deterministic local results without a key. Live mode calls OpenAI only from the backend and maps provider failures to public errors without returning diagnostics or environment values.

## Deployment boundary

Render hosts the compiled Express backend. Vercel hosts the Vite static frontend. `VITE_API_BASE_URL` points the browser to Render, and `FRONTEND_ORIGIN` allows only verified Vercel origins. Deployment is currently prepared but not completed.
