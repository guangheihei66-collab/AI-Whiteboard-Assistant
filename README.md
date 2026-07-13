# AI Whiteboard Assistant

AI Whiteboard Assistant is a student software engineering project inspired by Excalidraw. It provides a typed shape-based drawing workspace and a local mock AI analysis service designed for safe, incremental extension.

## Technology stack

- Frontend: React, TypeScript, Vite, and Tailwind CSS
- Whiteboard rendering: Konva and react-konva
- Interface icons: lucide-react
- Testing: Playwright
- Persistence: browser `localStorage`
- Backend: Node.js, Express, TypeScript, and CORS

## Project structure

```text
AI-Whiteboard-Assistant/
├── frontend/              # React, TypeScript, Vite, Tailwind, Konva
│   └── src/
│       ├── components/    # Canvas, Toolbar, and AI panel
│       ├── hooks/         # Canvas state and actions
│       └── types/         # Canvas domain types
├── backend/               # Express + TypeScript mock AI service
│   └── src/
│       ├── routes/ai.ts   # Mock analysis endpoint
│       └── index.ts       # Server setup
└── README.md
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Vite normally serves the application at `http://localhost:5173`.

## Run the backend

```bash
cd backend
npm install
npm run dev
```

The Express service listens at `http://localhost:3001` by default. Start both packages to use the Analyze Whiteboard button.

## Build for production

```bash
cd frontend
npm run build

cd ../backend
npm run build
```

## Completed features

- Three-column workspace with a tool panel, whiteboard, and AI assistant panel
- Pen, Rectangle, Circle, Text, and Eraser tools rendered with Konva
- Shared color and stroke-width controls
- Undo, Clear, versioned Save/Load, legacy line migration, and PNG export
- Unified typed element model shared with the mock analysis contract
- Express `POST /api/ai/analyze` endpoint with deterministic counts and suggestions
- Friendly AI panel loading, result, and backend-unavailable states
- Playwright coverage for canvas actions and mock AI integration

## Planned next

1. Add element selection, movement, resizing, and shape fill controls.
2. Replace prompt-based text entry with an inline canvas editor.
3. Add JSON document import/export and more durable persistence.
4. Introduce a provider interface before connecting any real AI service.
5. Add request validation tests, rate limiting, and production CORS settings.

## Out of scope for this MVP

Authentication, databases, real AI requests, API keys, multiplayer collaboration, image uploads, complex editing, pan/zoom, and cloud storage are intentionally deferred.

## Security notes

- The current AI response is generated locally and makes no outbound AI request.
- No API key is required. Never commit a real `.env` file.
- Dependency folders, builds, environment files, and Playwright artifacts are ignored by Git.
