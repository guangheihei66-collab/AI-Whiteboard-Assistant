# Company Readiness Implementation Plan

Date: 2026-07-31

Branch: `codex/company-readiness`

Design: `docs/superpowers/specs/2026-07-31-company-readiness-and-background-runtime-design.md`

## Delivery rules

- Modify files only inside this repository.
- Do not install global packages or modify Windows configuration.
- Preserve all existing whiteboard and AI behavior.
- Use project-local dependencies only.
- Complete and test one stage before starting the next stage.
- Keep runtime state and logs under the ignored `logs/` directory.
- Never stop a process by port alone.
- Never send a real Live AI request during automated acceptance.
- Check Git status and secrets before every commit.
- Do not push without an explicit user request.

## Stage 1: Shared background runtime manager

### Files

- Modify `project-start.json` only if the runtime schema needs explicit log or state settings.
- Refactor `scripts/start-project.ps1` to use shared runtime helpers.
- Add `scripts/project-runtime.ps1` for configuration, state, process, log, and readiness helpers.
- Add `scripts/stop-project.ps1`.
- Add `scripts/status-project.ps1`.
- Add `stop-project.cmd`.
- Add `status-project.cmd`.
- Update `.gitignore` for `logs/` runtime artifacts.

### Implementation

1. Parse and validate the existing launcher configuration without changing command trust boundaries.
2. Create versioned runtime state containing project root, launch timestamp, PID, process start time, service directory, readiness URL, and log paths.
3. Start service wrappers with `Start-Process -WindowStyle Hidden` and separate stdout/stderr files.
4. Detect verified existing services and avoid duplicate starts.
5. Detect stale or mismatched state without killing its PID.
6. On startup failure, stop only processes created by the current attempt.
7. Implement safe stop of a verified recorded process tree.
8. Implement status values: ready, running-not-ready, stopped, stale, and invalid-state.
9. Keep dependency installation consent unchanged.
10. Make CMD entry points pause only on error.

### Tests

```powershell
.\start-project.cmd -ValidateOnly
.\status-project.cmd
.\start-project.cmd -NoBrowser
.\start-project.cmd -NoBrowser
.\status-project.cmd
.\stop-project.cmd
.\status-project.cmd
```

Verify:

- no persistent visible terminal windows;
- `logs/runtime/state.json` exists only while appropriate;
- timestamped logs exist;
- duplicate start does not create duplicate recorded PIDs;
- readiness endpoints respond after start and fail after stop;
- unrelated Node processes are unchanged;
- working tree contains no tracked runtime files.

### Commit

`Add safe background project runtime controls`

## Stage 2: Frontend AI request reliability

### Files

- Refactor `frontend/src/services/ai.ts`.
- Add focused helpers under `frontend/src/services/` only if needed for testability.
- Modify `frontend/src/types/ai.ts` for health and diagnostic response types.
- Modify `frontend/src/components/AIPanel.tsx` for connection and retry states.
- Extend `frontend/src/services/ai.test.ts`.
- Extend `frontend/src/components/AIPanel.test.tsx`.
- Extend Playwright AI tests where visible behavior changes.

### Implementation

1. Add validated health-response parsing.
2. Add an in-memory health cache with a short TTL.
3. Add abort-aware timeout composition.
4. Add a request lifecycle callback or state result for connecting, retrying, and requesting.
5. Parse `Retry-After` and `X-Request-Id` response headers.
6. Retry Mock requests at most once for network, 502, 503, or 504 failures.
7. Never automatically retry Live model requests, 429 responses, invalid requests, invalid responses, or cancellations.
8. Preserve input and expose precise, actionable error messages.
9. Keep Analyze read-only and Generate preview-first.

### Tests

```powershell
cd frontend
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Verify unit coverage for health warm-up, cache, timeout, abort, one retry, no Live retry, no 429 retry, Retry-After, Request ID, and existing safe rendering.

### Commit

`Improve AI request resilience and diagnostics`

## Stage 3: Backend request diagnostics and shutdown

### Files

- Modify `backend/src/app.ts`.
- Modify `backend/src/index.ts`.
- Modify `backend/src/types/ai.ts` for safe diagnostic fields.
- Add `backend/src/middleware/requestContext.ts` if it keeps responsibilities focused.
- Add `backend/src/utils/logger.ts` if structured logging needs an isolated interface.
- Extend backend API and security tests.
- Modify backend package scripts only when required for lint/check commands.

### Implementation

1. Validate or create UUID request IDs.
2. Return `X-Request-Id` on every API response.
3. Include optional `requestId` in safe API error bodies.
4. Log timestamp, request ID, method, path, status, duration, and safe AI mode.
5. Prohibit request bodies, headers, user content, environment values, provider output, and secrets from logs.
6. Add secret-free uptime and version fields to health only if they remain stable and useful.
7. Add bounded `SIGINT` and `SIGTERM` shutdown handling around the HTTP server.
8. Preserve existing CORS, schemas, rate limits, Mock, and Live runner behavior.

### Tests

```powershell
cd backend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Verify request ID generation/propagation, safe error bodies, privacy-safe logger arguments, unchanged health security, and existing 21+ tests.

### Commit

`Add safe backend request diagnostics`

## Stage 4: Company-grade project checks

### Files

- Update `frontend/package.json` and `backend/package.json` scripts and Node engine metadata.
- Reuse the existing lint tool for backend only if compatible and project-local.
- Add `scripts/verify-project.ps1`.
- Add `verify-project.cmd`.
- Update `.github/workflows/ci.yml` to call equivalent commands without weakening existing jobs.
- Add or update Node version metadata only within the repository.

### Implementation

1. Define consistent supported Node major version.
2. Add composable `check` scripts.
3. Add a one-click verification wrapper that never installs dependencies silently.
4. Keep E2E in Mock mode.
5. Keep CI artifact upload limited to failures.
6. Avoid dependency-audit failures as a mandatory gate unless results are deterministic and actionable.

### Tests

```powershell
.\verify-project.cmd
git diff --check
```

### Commit

`Add company-grade project verification`

## Stage 5: Operations and user documentation

### Files

- Add `docs/USER_MANUAL.md`.
- Add `SECURITY.md`.
- Update `README.md`.
- Update `PROJECT_CONTEXT.md`.
- Update `docs/architecture.md`.
- Update `docs/decisions.md`.
- Update `docs/changelog.md`.
- Update `docs/todo.md`.
- Update `docs/reusable-project-launcher.md`.

### Manual requirements

The user manual must contain exact Windows instructions for prerequisites, first start, daily start, browser access, status, stop, shutdown, duplicate start, logs, log cleanup, Mock AI, optional Live AI, every user-facing AI error, cold starts, ports, stale runtime state, missing dependencies, tests, Git safety, updates, and complete local cleanup.

Every destructive or potentially disruptive step must state its scope and risk before the command. No command may delete files outside this repository.

### Documentation verification

- Check every referenced filename and command exists.
- Confirm README links resolve relative to the repository.
- Confirm no real API key, private address, token, password, or personal data appears.
- Confirm the manual distinguishes closing the browser from stopping services.

### Commit

`Document background operation and support workflows`

## Stage 6: Final acceptance

### Local quality suite

```powershell
cd frontend
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e

cd ..\backend
npm.cmd test
npm.cmd run typecheck
npm.cmd run build

cd ..
.\start-project.cmd -ValidateOnly
.\verify-project.cmd
git diff --check
```

### Runtime acceptance

1. Record project-owned and unrelated Node process IDs.
2. Start with `start-project.cmd -NoBrowser`.
3. Verify both readiness endpoints.
4. Verify hidden operation and log creation.
5. Run duplicate start and verify no duplicate PIDs.
6. Run status and validate output.
7. Exercise Pen, editing, persistence, export, Analyze, Generate, preview, Apply, Cancel, and batch Undo using Playwright.
8. Stop with `stop-project.cmd`.
9. Verify readiness endpoints are unavailable.
10. Verify unrelated Node process IDs were not terminated.

### Online Mock acceptance

- Check the real frontend and health endpoint.
- Run a small bounded sequence of Analyze requests.
- Verify CORS, console errors, page errors, and failed network requests.
- Do not use a real OpenAI API key.

### Security and Git acceptance

- Confirm `.env`, `logs`, `node_modules`, `dist`, and test artifacts are not tracked.
- Scan current tracked files and Git diff for real key patterns without printing values.
- Inspect status and staged paths before the final commit.
- Do not push unless the user explicitly asks.

### Final commit

`Harden AI Whiteboard Assistant operations`

## Rollback and recovery

- Every stage is an independent commit.
- A failed stage is fixed forward on the feature branch; no hard reset or force push is used.
- Runtime acceptance records the PIDs it creates and calls the safe stop entry point in cleanup.
- If a launcher test fails before state is written, inspect only project logs and processes started by that test.
- Existing v1.0.0 source remains reachable at tag `v1.0.0` and is never overwritten.
