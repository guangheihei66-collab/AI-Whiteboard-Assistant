# Project Context

## Project goal

AI Whiteboard Assistant is a maintainable student software-engineering project that combines an Excalidraw-inspired React/Konva whiteboard with secure, preview-first AI analysis and content generation.

## Technology stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Konva, react-konva, Vitest, React Testing Library, and Playwright.
- Backend: Node.js, Express, TypeScript, Zod, OpenAI Node SDK, Node test runner, and Supertest.
- Persistence: versioned browser localStorage.
- Automation: GitHub Actions on Node.js 24 LTS.

## Current architecture

- `frontend/src/hooks/useCanvas.ts` coordinates tools, selection, history, persistence, export, and AI proposal application.
- Canvas elements use a strict discriminated union and are rendered by `react-konva`.
- The browser calls only the Express backend for AI operations.
- The backend validates Analyze and Generate input/output and supports deterministic Mock mode or backend-only Live mode.
- Generated content follows Generate, validate, preview, confirm, and batch-apply steps.

## Completed functionality

- Pen, Rectangle, Circle, Text, Eraser, and Select.
- Move, resize, rotate, delete, layer ordering, Undo/Redo, shortcuts, Save/Load, autosave, and PNG export.
- Mock/Live AI Analyze and Generate with cancellation, safe errors, preview, Apply, Cancel, and batch Undo/Redo.
- Versioned storage validation and legacy migration.
- Desktop three-column layout and small-screen stacked layout.
- Backend API tests, frontend unit tests, Playwright E2E, Error Boundary, bounded history, and freehand sampling.

## Unfinished work

- Render backend and Vercel frontend are not deployed.
- Live AI has not been tested with a real API key in this release-acceptance environment.
- Stage-eight deployment configuration, repository screenshot, README packaging, and long-term documentation are complete locally.
- Real Render and Vercel deployment plus online acceptance remain pending.
- The `v1.0.0` tag is blocked until real deployment and online acceptance pass.

## Resolved bugs

- Corrupted localStorage is rejected without crashing the app.
- AI proposals cannot change the board before explicit Apply and undo as one batch.
- AI request cleanup now avoids updates after unmount while remaining compatible with React StrictMode effect replay.
- Small screens no longer inherit a forced 980px document width.
- Freehand lines ignore sub-pixel duplicate movement and stop growing after 5,000 point pairs.

## Important design decisions

- Keep React hooks instead of adding a state-management library.
- Retain at most 100 history snapshots.
- Test stable state and visible behavior instead of Konva internals.
- Never call OpenAI from the frontend or commit a real environment file.
- Mock mode is the default for local development, CI, and public evaluation.
- Prepare deployment before tagging; do not claim an online release until real URLs are verified.
