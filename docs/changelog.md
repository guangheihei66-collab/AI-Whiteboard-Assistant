# Changelog

## Unreleased

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
