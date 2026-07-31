# Architecture Decisions

## 2026-07-31 - Observable but privacy-safe runtime

Decision: run the local launcher as hidden, project-owned processes and persist only PID/start-time metadata plus timestamped stdout/stderr logs under an ignored `logs/runtime` directory.

Reason: users should not need to keep a terminal open, while stop operations must never kill an unrelated process by port. AI failures need a correlation ID and timing information, but logs must not contain prompts, boards, environment variables, or credentials.

## 2026-07-31 - Bounded AI resilience

Decision: health checks may retry one transient failure; Mock requests may retry one transient network/502-504 failure; Live requests never auto-retry.

Reason: this improves cold-start and network tolerance without duplicating potentially billable Live requests or hiding persistent failures.

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
