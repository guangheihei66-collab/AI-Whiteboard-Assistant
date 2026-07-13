# AI Whiteboard Assistant — Backend

This package provides a local Express + TypeScript service for the mock AI assistant. It never calls a real AI provider and does not require an API key.

## Start locally

```bash
npm install
npm run dev
```

The service listens on `http://localhost:3001` by default.

## Build and run

```bash
npm run build
npm start
```

## Endpoints

- `GET /api/health` returns service health.
- `POST /api/ai/analyze` accepts `{ "elements": [...] }` and returns deterministic counts and suggestions.

`.env.example` documents the supported `PORT` variable for shells and process managers. Do not commit a real `.env` file.
