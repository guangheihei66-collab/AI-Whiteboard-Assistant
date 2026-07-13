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
│       ├── components/    # Canvas, Transformer, Toolbar, and AI panel
│       ├── hooks/         # History, shortcuts, auto-save, and canvas actions
│       ├── types/         # Strict canvas element unions
│       └── utils/         # Storage migration and element validation
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
- Select mode with element movement and visible Transformer controls
- Rectangle, ellipse-compatible Circle, and Text resizing and rotation
- Line selection and movement without altering freehand point behavior
- Shared color and stroke-width controls
- Undo/Redo history for creation, movement, transforms, deletion, clearing, and layers
- Delete/Backspace removal, keyboard tool shortcuts, and Escape deselection
- Bring Forward and Send Backward layer controls
- Debounced automatic saving and automatic refresh recovery
- Versioned Save/Load with version 1/2 migration, strict validation, and PNG export
- Unified typed element model shared with the mock analysis contract
- Express `POST /api/ai/analyze` endpoint with deterministic counts and suggestions
- Friendly AI panel loading, result, and backend-unavailable states
- Playwright coverage for canvas actions and mock AI integration

## Planned next

1. Replace prompt-based text entry with an inline canvas editor.
2. Add multi-selection, duplicate, copy/paste, and alignment controls.
3. Add JSON document import/export and shape fill controls.
4. Introduce a provider interface before connecting any real AI service.
5. Add request validation tests, rate limiting, and production CORS settings.

## Keyboard shortcuts

- `V`, `P`, `R`, `C`, `T`, `E`: Select, Pen, Rectangle, Circle, Text, and Eraser
- `Delete` / `Backspace`: delete the selected element
- `Ctrl/Cmd+Z`: Undo
- `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y`: Redo
- `Escape`: clear selection
- `Ctrl/Cmd+S`: save to local storage

## Out of scope for this MVP

Authentication, databases, real AI requests, API keys, multiplayer collaboration, image uploads, complex editing, pan/zoom, and cloud storage are intentionally deferred.

## Security notes

- The current AI response is generated locally and makes no outbound AI request.
- No API key is required. Never commit a real `.env` file.
- Dependency folders, builds, environment files, and Playwright artifacts are ignored by Git.
