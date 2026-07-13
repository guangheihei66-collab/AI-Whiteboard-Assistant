# Project Context

## Project goal

AI Whiteboard Assistant is a maintainable student software-engineering project that combines an Excalidraw-inspired React/Konva whiteboard with secure, preview-first AI analysis and content generation.

## Technology stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Konva, react-konva, Vitest, React Testing Library, and Playwright.
- Backend: Node.js, Express, TypeScript, Zod, OpenAI Node SDK, Node test runner, and Supertest.
- Persistence: versioned browser localStorage.
- Automation: GitHub Actions on Node.js 24 LTS and a project-local, configuration-driven Windows launcher.

## Current architecture

- `frontend/src/hooks/useCanvas.ts` coordinates tools, selection, history, persistence, export, and AI proposal application.
- Canvas elements use a strict discriminated union and are rendered by `react-konva`.
- The browser calls only the Express backend for AI operations.
- The backend validates Analyze and Generate input/output and supports deterministic Mock mode or backend-only Live mode.
- Generated content follows Generate, validate, preview, confirm, and batch-apply steps.
- `start-project.cmd` delegates to a reusable PowerShell launcher, while `project-start.json` keeps service-specific commands and readiness URLs outside the script logic.

## Completed functionality

- Pen, Rectangle, Circle, Text, Eraser, and Select.
- Move, resize, rotate, delete, layer ordering, Undo/Redo, shortcuts, Save/Load, autosave, and PNG export.
- Mock/Live AI Analyze and Generate with cancellation, safe errors, preview, Apply, Cancel, and batch Undo/Redo.
- Versioned storage validation and legacy migration.
- Desktop three-column layout and small-screen stacked layout.
- Backend API tests, frontend unit tests, Playwright E2E, Error Boundary, bounded history, and freehand sampling.
- One-click Windows startup with environment validation, opt-in project-local dependency installation, separate service windows, readiness checks, and browser opening.

## Unfinished work

- Live AI has not been tested with a real API key in this release-acceptance environment.
- The `v1.0.0` tag remains pending explicit release approval.
- Product roadmap items such as arrow connectors, pan/zoom, cloud persistence, and collaboration remain future work.

## Resolved bugs

- Corrupted localStorage is rejected without crashing the app.
- AI proposals cannot change the board before explicit Apply and undo as one batch.
- AI request cleanup now avoids updates after unmount while remaining compatible with React StrictMode effect replay.
- Small screens no longer inherit a forced 980px document width.
- Freehand lines ignore sub-pixel duplicate movement and stop growing after 5,000 point pairs.
- Local startup readiness checks bypass the Windows proxy and use the correct IPv4/IPv6 loopback address for each service.
- Render production builds explicitly include development dependencies so TypeScript and framework declaration packages are available before the runtime starts in production mode.
- Production CORS now allows the exact verified Vercel origin, while health, Mock Analyze, Mock Generate preview, Cancel, and browser-console acceptance pass online.

## Important design decisions

- Keep React hooks instead of adding a state-management library.
- Retain at most 100 history snapshots.
- Test stable state and visible behavior instead of Konva internals.
- Never call OpenAI from the frontend or commit a real environment file.
- Mock mode is the default for local development, CI, and public evaluation.
- Prepare deployment before tagging; do not claim an online release until real URLs are verified.
- Keep the reusable launcher inside each repository and configure it with JSON instead of installing a machine-global launcher.
- Deploy the static `frontend` directory to Vercel and the Express `backend` to Render; keep the public deployment in Mock mode unless Live credentials are intentionally configured server-side.
