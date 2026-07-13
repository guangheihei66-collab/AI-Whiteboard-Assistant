# Reusable Project Launcher

The launcher starts multiple local services from one Windows double-click without a global package, registry change, `PATH` change, or permanent PowerShell policy change.

## Files to copy

Copy these files into the root of another repository while preserving the `scripts` directory:

```text
project/
|-- start-project.cmd
|-- project-start.json
`-- scripts/
    `-- start-project.ps1
```

Keep the CMD and PowerShell files unchanged. Edit `project-start.json` for the new repository.

## Configuration

```json
{
  "version": 1,
  "browserUrl": "http://localhost:5173",
  "startupTimeoutSeconds": 90,
  "services": [
    {
      "name": "Backend",
      "directory": "backend",
      "installCommand": "npm.cmd install",
      "startCommand": "npm.cmd run dev",
      "readyUrl": "http://127.0.0.1:3001/api/health"
    },
    {
      "name": "Frontend",
      "directory": "frontend",
      "installCommand": "npm.cmd install",
      "startCommand": "npm.cmd run dev -- --strictPort",
      "readyUrl": "http://localhost:5173"
    }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `version` | Yes | Configuration format; currently `1` |
| `browserUrl` | Yes | Page opened after configured services are ready |
| `startupTimeoutSeconds` | No | Overall readiness timeout from 5 to 600 seconds; default `60` |
| `services` | Yes | One or more local services |
| `name` | Yes | Safe terminal-window label |
| `directory` | Yes | Service directory relative to the repository root |
| `startCommand` | Yes | Command run in the visible service window |
| `installCommand` | No | npm install command offered only when `node_modules` is missing |
| `readyUrl` | No | HTTP(S) endpoint polled before opening the browser |

Service directories are normalized and rejected if they escape the repository. Commands are repository-owned configuration and should be reviewed before running copied launcher files.

## Daily use

Double-click `start-project.cmd`. Close each service window or press `Ctrl+C` to stop it.

Validate a copied configuration without installing or starting anything:

```powershell
.\start-project.cmd -ValidateOnly
```

Start services without opening a browser:

```powershell
.\start-project.cmd -NoBrowser
```

## Other project types

The service command can run any locally available executable. For example, a Python backend with an existing project-local virtual environment can use:

```json
{
  "name": "Python API",
  "directory": "backend",
  "startCommand": ".\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --reload",
  "readyUrl": "http://127.0.0.1:8000/health"
}
```

The launcher automatically offers dependency installation only for configured npm services. For other ecosystems, create the project-local environment and dependencies using that project's documented setup before starting.

## Safety boundary

- No global dependency installation.
- No system `PATH`, registry, environment-variable, or permanent execution-policy modification.
- No `.env` content is read or printed by the launcher.
- No automatic process killing by port.
- No production process supervision.
