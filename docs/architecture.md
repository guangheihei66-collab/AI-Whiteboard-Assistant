# Architecture

## Frontend

React composes the Toolbar, Konva Canvas, selection Transformer, AI Panel, and Error Boundary. `useCanvas` coordinates tools, element state, selection, bounded history, persistence, export, and batch proposal application. Pure utilities validate storage, normalize generated elements, sample freehand points, and transition history.

The current canvas is automatically saved as a versioned localStorage document. AI preview elements remain separate from formal elements, history, Save, autosave, and PNG export until Apply.

## Backend

Express exposes `/api/health`, `/api/ai/analyze`, and `/api/ai/generate`. Zod validates request data and Live model output. Rate limits, request-size limits, timeouts, cancellation, strict CORS origins, and safe error bodies form the API boundary.

Mock mode returns deterministic local results without a key. Live mode calls OpenAI only from the backend and maps provider failures to public errors without returning diagnostics or environment values.

## Deployment boundary

Render hosts the compiled Express backend. Vercel hosts the Vite static frontend. `VITE_API_BASE_URL` points the browser to Render, and `FRONTEND_ORIGIN` allows only verified Vercel origins. Deployment is currently prepared but not completed.

## Local development launcher

`start-project.cmd` is the Windows double-click boundary. It invokes `scripts/start-project.ps1` with a process-only execution-policy bypass. The PowerShell script validates the versioned `project-start.json`, keeps all service paths inside the repository, optionally requests permission for missing npm dependencies, opens visible service terminals, checks readiness, and opens the frontend.

Project-specific commands and URLs live only in `project-start.json`, so later projects can reuse the launcher without changing its implementation. The launcher does not install global packages, modify system configuration, read secret values, or manage production processes.
