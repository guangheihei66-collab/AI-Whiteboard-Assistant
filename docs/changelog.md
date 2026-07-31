# Changelog

## 2026-07-31 - Company readiness hardening

- Added hidden background startup, status, and safe stop commands with PID/start-time ownership checks and timestamped ignored logs.
- Added AI health preflight, timeout handling, bounded Mock retry, Live no-retry behavior, request phase feedback, and correlation IDs.
- Added backend request IDs, privacy-safe request logging, graceful shutdown, and CORS exposure for diagnostic headers.
- Added the reusable local acceptance command, `.nvmrc`, a detailed Chinese user manual, and `SECURITY.md`.

## v1.0.0 - 2026-07-13

### Final release acceptance

- Re-ran frontend lint, 17 frontend tests, production build, 21 backend tests, backend typecheck/build, and 15 Playwright scenarios.
- Verified the production whiteboard editing, persistence, PNG export, Mock Analyze/Generate, preview confirmation, batch history, CORS, console health, and mobile layout.
- Confirmed tracked files and Git history contain no real OpenAI API key and that environment, dependency, build, and test artifacts remain excluded.

### Production deployment

- Deployed the Vite frontend to Vercel and the Express backend to Render Free.
- Fixed production TypeScript dependency installation and configured exact-origin CORS.
- Verified online health, Mock Analyze, Mock Generate preview, Cancel, and a clean browser console.

### Reusable local launcher

- Added a Windows `start-project.cmd` entry point for one-click frontend and backend startup.
- Added versioned service configuration, repository path validation, dependency consent, readiness checks, and automatic browser opening.
- Documented how to reuse the launcher without global installation or system configuration changes.
- Fixed Render TypeScript builds by including development-only compiler and declaration packages during `npm ci`.

### Stage eight - Deployment preparation and packaging

- Added Render Blueprint preparation and production API configuration safeguards.
- Added a privacy-safe project screenshot, architecture documentation, MIT license, and contribution guide.
- Documented the real deployment status as `尚未部署`.

### Stage seven - Testing, CI, and reliability

- Added Vitest and React Testing Library coverage for storage, history, toolbar, shortcuts, AI states, and Error Boundary behavior.
- Expanded backend API security and CORS tests.
- Added a release-level Playwright flow and mobile layout acceptance.
- Added bounded freehand sampling, StrictMode-safe AI cleanup, responsive stacking, and GitHub Actions CI.

Earlier stages delivered core drawing, element editing, persistence, PNG export, secure AI Analyze, and preview-first AI Generate.
