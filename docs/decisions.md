# Architecture Decisions

## 2026-07-13 - Local-first React state

Decision: keep canvas state in React hooks with pure history and storage helpers.

Reason: the current scope does not justify a large state-management dependency, and pure helpers make history behavior testable.

## 2026-07-13 - Preview-first AI generation

Decision: AI proposals remain separate from formal elements until explicit Apply.

Reason: users retain control, unsafe output is rejected twice, and one Apply maps cleanly to one Undo/Redo step.

## 2026-07-13 - Backend-only Live AI

Decision: only Express may call OpenAI; Mock mode remains the default for local use and CI.

Reason: browser bundles and repositories must never contain the API key, and public evaluators need a no-cost path.

## 2026-07-13 - Render and Vercel deployment target

Decision: prepare Render for Express and Vercel for Vite, but do not create a release tag before real online acceptance.

Reason: these hosts match the two-package architecture, while a verified deployment must precede a public v1.0.0 claim.

## 2026-07-13 - Project-local reusable launcher

Decision: use a root CMD entry point, a reusable PowerShell implementation, and a versioned JSON service configuration instead of installing one machine-global launcher.

Reason: each repository remains self-contained, reviewable, Git-friendly, and safely removable. Future projects reuse the same scripts by changing only service directories, commands, and readiness URLs.
