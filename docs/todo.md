# Roadmap

## Deployment gate

- Create the Render backend service from `render.yaml` in Mock mode.
- Verify the real Render `/api/health` URL.
- Create the Vercel frontend project with `frontend` as Root Directory.
- Set the verified Render origin as `VITE_API_BASE_URL`.
- Set the verified Vercel origin as Render `FRONTEND_ORIGIN` and redeploy.
- Run online desktop/mobile, CORS, refresh, console, Mock AI, and failure-state acceptance.
- Optionally configure Live AI in Render and perform one controlled request.
- Update README with verified URLs, then create and push `v1.0.0`.

## Product improvements

- Arrow connectors and stronger graph layout.
- Pan, zoom, grouping, and richer text editing.
- Optional accounts, cloud boards, and collaboration.
- Evidence-based bundle splitting and loading optimization.
- Add a cross-platform shell entry point only if macOS or Linux users request it; the current one-click launcher intentionally targets Windows.
