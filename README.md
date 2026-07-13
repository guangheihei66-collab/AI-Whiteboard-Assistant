# AI Whiteboard Assistant

AI Whiteboard Assistant is a student software engineering project inspired by Excalidraw. The first-stage MVP provides a focused online drawing workspace and keeps clear extension points for future AI features.

## Technology stack

- Frontend: React, TypeScript, Vite, and Tailwind CSS
- Whiteboard rendering: Konva and react-konva
- Interface icons: lucide-react
- Testing: Playwright
- Persistence: browser `localStorage`
- Planned backend: Node.js and Express

## Project structure

```text
AI-Whiteboard-Assistant/
├── frontend/              # React, TypeScript, Vite, Tailwind, Konva
│   └── src/
│       ├── components/    # Canvas, Toolbar, and AI panel
│       ├── hooks/         # Canvas state and actions
│       └── types/         # Canvas domain types
├── backend/               # Future Node.js + Express service
└── README.md
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Vite normally serves the application at `http://localhost:5173`.

## Build for production

```bash
cd frontend
npm run build
```

## Completed in phase one

- Three-column workspace with a tool panel, whiteboard, and AI assistant panel
- Pen-based freehand drawing rendered with Konva
- Undo and Clear canvas actions
- Save and Load using browser `localStorage`
- Selectable placeholders for Rectangle, Circle, Text, and Eraser
- Typed, modular frontend structure designed for extension

## Planned next

1. Implement rectangle, circle, text, and eraser behavior.
2. Add selection, movement, resizing, colors, and stroke controls.
3. Introduce document import/export and more durable persistence.
4. Add a small Express API and a versioned AI canvas-analysis contract.
5. Add automated component and end-to-end tests before collaboration features.

## Out of scope for this MVP

Authentication, databases, real AI requests, multiplayer collaboration, image uploads, complex editing, pan/zoom, and cloud storage are intentionally deferred.
