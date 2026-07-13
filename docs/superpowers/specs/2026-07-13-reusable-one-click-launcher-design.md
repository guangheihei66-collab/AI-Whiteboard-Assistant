# Reusable One-Click Project Launcher Design

## Goal

Add a Windows one-click launcher to AI Whiteboard Assistant that starts the frontend and backend without global installation or system configuration. The same launcher files must be reusable in later multi-service projects by editing a small JSON configuration file.

## Scope

This change adds local development startup only. It does not install Node.js, change `PATH`, modify the PowerShell execution policy, manage production processes, or create files outside the repository.

## Architecture

The launcher has three focused parts:

- `start-project.cmd` is the double-click entry point. It locates the repository from its own path and invokes the PowerShell implementation with a process-only execution-policy bypass.
- `scripts/start-project.ps1` validates the environment and configuration, optionally installs missing project-local dependencies after confirmation, opens one visible terminal window per service, waits for the configured browser URL, and opens it.
- `project-start.json` contains project-specific service names, relative directories, development commands, readiness URLs, and the browser URL. Future projects reuse the launcher by changing this file rather than editing script logic.

## Configuration Contract

The configuration uses a versioned structure:

```json
{
  "version": 1,
  "browserUrl": "http://localhost:5173",
  "startupTimeoutSeconds": 60,
  "services": [
    {
      "name": "Backend",
      "directory": "backend",
      "installCommand": "npm.cmd install",
      "startCommand": "npm.cmd run dev",
      "readyUrl": "http://localhost:3001/api/health"
    },
    {
      "name": "Frontend",
      "directory": "frontend",
      "installCommand": "npm.cmd install",
      "startCommand": "npm.cmd run dev",
      "readyUrl": "http://localhost:5173"
    }
  ]
}
```

Required fields are `version`, `browserUrl`, and a non-empty `services` array. Each service requires `name`, `directory`, and `startCommand`. `installCommand` and `readyUrl` are optional so the template can support non-Node projects later.

## Startup Flow

1. Resolve the repository root from the launcher location instead of the user's current directory.
2. Verify that `project-start.json` exists, parses successfully, and uses version `1`.
3. Inspect the configured commands and verify Node.js and npm only when a service uses npm. The current project uses npm for both services, while a future non-Node configuration is not forced through this check.
4. Resolve every service directory and reject missing directories or paths outside the repository root.
5. For a service with an npm `installCommand`, check for `node_modules`. If it is missing, explain that installation uses the dependencies declared by that service and the npm registry, then ask for confirmation. Other ecosystems may provide an `installCommand`, but the launcher does not infer their dependency-directory convention and therefore does not run it automatically.
6. Open each service in its own visible terminal window. The window title identifies the project and service. Closing that window, or pressing `Ctrl+C` in it, stops that service.
7. Poll configured readiness URLs until all configured services respond or the timeout expires.
8. Open `browserUrl` after readiness succeeds. On timeout, keep the service windows open and display a clear diagnostic instead of pretending startup succeeded.

The launcher does not read or print `.env` contents. Services continue to load their own environment configuration normally.

## Validation and Error Handling

The script exits with a non-zero status and a concise message when:

- the configuration is missing, invalid JSON, unsupported, or incomplete;
- Node.js or npm is unavailable when an npm command is configured;
- a service directory is missing or escapes the repository root;
- dependency installation is declined or fails;
- a service command cannot be launched.

A `-ValidateOnly` option validates the environment and configuration without installing dependencies, starting processes, or opening the browser. This provides a safe automated check for this project and future templates.

## Reuse Model

For another project, copy `start-project.cmd`, `scripts/start-project.ps1`, and `project-start.json` into its root. Keep the script unchanged and edit only the JSON service entries. The launcher supports any local command that can run in a Windows terminal; npm remains a project-specific configuration choice rather than a global launcher requirement.

## Documentation Changes

The root README will add a one-click startup section with normal manual commands retained as a fallback. `PROJECT_CONTEXT.md`, `docs/decisions.md`, and `docs/changelog.md` will record the launcher boundary and current status. A short reusable-launcher guide will document how to adapt the configuration for later projects.

## Verification

Verification will be incremental:

1. Run `-ValidateOnly` and confirm configuration and path validation pass.
2. Run the launcher and verify the backend health endpoint responds.
3. Verify the frontend responds and the browser URL is correct.
4. Close the spawned service windows and verify their development servers stop.
5. Run existing frontend and backend build commands to ensure no product behavior changed.
6. Check `git status` and sensitive-file rules before reporting completion.

## Non-Goals

- No global launcher installation.
- No desktop shortcut or registry modification.
- No background Windows service.
- No automatic process killing by port.
- No global dependency installation.
- No replacement for deployment or production process management.
