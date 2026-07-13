# Roadmap

## Deployment status

- Render backend is deployed in Mock mode and `/api/health` is verified.
- Vercel frontend is deployed from the `frontend` Root Directory.
- `VITE_API_BASE_URL` and exact-origin `FRONTEND_ORIGIN` are configured.
- Online page load, CORS, Mock Analyze, Mock Generate preview, Cancel, and browser console checks pass.
- Live AI remains optional and has not used a real paid API request in this acceptance environment.
- Create and push `v1.0.0` only after explicit release approval.

## Product improvements

- Arrow connectors and stronger graph layout.
- Pan, zoom, grouping, and richer text editing.
- Optional accounts, cloud boards, and collaboration.
- Evidence-based bundle splitting and loading optimization.
- Add a cross-platform shell entry point only if macOS or Linux users request it; the current one-click launcher intentionally targets Windows.
