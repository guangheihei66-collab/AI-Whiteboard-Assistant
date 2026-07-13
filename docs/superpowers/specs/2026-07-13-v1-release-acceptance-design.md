# AI Whiteboard Assistant v1 Release Acceptance Design

## Scope and delivery

This work completes two independently verified stages on top of commit `2ac4ac6`. Existing drawing, editing, persistence, export, AI Analyze, and AI Generate behavior must remain intact. No large refactor, real API-key test, or fabricated deployment result is allowed.

Stage seven adds tests, reliability safeguards, focused performance fixes, accessibility checks, and CI. It is committed and pushed before stage eight begins. Stage eight prepares Render and Vercel deployment, packages the GitHub repository, captures a privacy-safe local screenshot, and documents that the online demo is not yet deployed. Because no real deployment exists, this work does not create a `v1.0.0` tag.

## Stage seven: tests, reliability, and CI

### Baseline and testing strategy

Before modifications, run the existing frontend lint, build, and Playwright suite plus backend tests, typecheck, and build. Preserve those results as the regression baseline.

Add Vitest, React Testing Library, jest-dom, and jsdom to the frontend package only. Unit tests target observable behavior and stable state boundaries rather than Konva internals:

- Toolbar tool state and disabled Undo/Redo actions.
- Versioned storage validation, corrupt-data handling, and autosave serialization.
- History transitions for deletion and batch AI Apply/Undo.
- AI preview cancellation and Analyze/Generate loading, success, and error states.
- Shortcut suppression while an input owns focus.
- Safe text rendering without `dangerouslySetInnerHTML`.

Keep Playwright for browser-level whiteboard interactions. Add or consolidate a stable core journey covering shape creation, selection and movement, Undo/Redo, Save/refresh recovery, Mock Generate preview, Apply, and one-step batch Undo. Backend tests remain on the existing Node test runner and Supertest; they cover health, Mock contracts, invalid requests, limits, CORS, body size, safe Live-mode errors, malformed provider output, and error-response secrecy. Tests never call the real OpenAI API.

### Reliability and error handling

Add a React Error Boundary above the application. It shows a short recovery screen and Reload action, logs only the Error object in development, and does not expose a production stack or canvas/request contents. Normal API errors stay within `AIPanel`.

Apply only evidence-backed stability fixes found during inspection or testing. Candidate safeguards are a bounded history, conservative freehand point sampling, abort-safe AI state updates, listener and timer cleanup, debounced autosave, and a friendly PNG export failure. Pointer movement and Transformer movement must not create repeated history entries.

### Accessibility and responsive acceptance

Audit icon buttons, disabled states, labels, focus visibility, error visibility, panel scrolling, and color controls. Validate desktop and a small mobile viewport with Playwright. The acceptance threshold is functional access without severe overlap or clipped primary actions; a full mobile redesign is outside scope.

### Continuous integration

Create `.github/workflows/ci.yml` for push and pull requests using a stable Node LTS release and npm caching. Separate jobs run:

- Frontend: `npm ci`, lint, unit tests, and build.
- Backend: `npm ci`, tests, typecheck, and build in Mock configuration.
- E2E: install the Playwright Chromium dependency, start local frontend/backend through the existing Playwright configuration, and run the browser suite in Mock mode.

No workflow secret or real API key is required. Test traces, screenshots, videos, build outputs, and dependency folders remain ignored.

Stage seven is committed and pushed as `Add testing CI and reliability improvements`.

## Stage eight: deployment preparation and project packaging

### Backend deployment preparation

The Express process continues to read `PORT`, listens on `0.0.0.0`, exposes `/api/health`, and starts compiled output through `npm start`. CORS accepts only explicitly configured frontend origins, with strict parsing if multiple origins are supported. Logs never print keys or environment values.

Add a root `render.yaml` only if it accurately represents the repository layout. It declares the `backend` root, `npm ci && npm run build`, `npm start`, `/api/health`, Mock mode by default, and non-secret environment variable names. A real OpenAI key remains a Render Dashboard-only value.

### Frontend deployment preparation

The browser uses `VITE_API_BASE_URL` for production API requests. Development may retain its localhost default, but a production build without a configured backend URL must surface a friendly configuration error rather than silently calling localhost. Vercel settings are documented as root `frontend`, Vite preset, `npm run build`, and output `dist`. Add `vercel.json` only if an actual routing requirement exists; this single-page application has no client-side routes requiring a rewrite today.

### Repository presentation

Update the root README with:

- Project name, one-sentence summary, and online-demo status `尚未部署`.
- A locally captured, privacy-safe screenshot stored under `docs/images/`.
- Core whiteboard features, AI Analyze and Generate workflows, Mock/Live modes, technology stack, architecture, project tree, local setup, environment variables, test commands, deployment steps, security notes, limitations, and future work.
- A Mermaid diagram showing React/Konva frontend, canvas state/history, localStorage, Express backend, Mock/Live branching, and backend-only OpenAI access.

Add an MIT `LICENSE`, concise `CONTRIBUTING.md`, `PROJECT_CONTEXT.md`, and the long-term project documents `docs/architecture.md`, `docs/decisions.md`, `docs/changelog.md`, and `docs/todo.md`. Package versions and the Git release tag remain unchanged until a real deployment passes online acceptance.

Stage eight is committed and pushed as `Prepare deployment and project documentation`.

## Security and release gates

Before each commit, inspect `git status`, staged files, `git diff --check`, tracked artifacts, current source, and Git history for high-confidence API-key patterns. Generic words such as token, password, and secret are reviewed in context so documentation and dependency metadata do not create false release claims. Never print a discovered value.

If a plausible real key or private deployment address is found, stop before staging, committing, or pushing and report the affected path without exposing the value. Confirm that `.env`, dependency folders, build outputs, Playwright artifacts, and screenshots with private data are not tracked.

## Acceptance and known deployment state

Stage seven passes only when frontend lint, unit tests, build, Playwright E2E, backend tests, typecheck, and build succeed. Stage eight repeats the complete local suite after deployment and documentation changes.

No online frontend or backend exists at design time. Online health, CORS, routing, console, Mock/Live AI, and mobile deployment checks remain explicitly unverified. The final report must say `尚未部署`, provide no fabricated URL, list the manual Render-then-Vercel deployment sequence, and confirm that no `v1.0.0` tag was created.
