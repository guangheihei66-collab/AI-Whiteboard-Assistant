# AI Whiteboard Assistant — Frontend

The frontend is a Vite + React + TypeScript application that renders an interactive whiteboard with Konva and styles the workspace with Tailwind CSS.

## Start locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

## MVP features

- Freehand Pen drawing with React-managed line data
- Undo the most recent line
- Clear all lines
- Save and restore the canvas with `localStorage`
- Selectable placeholders for Rectangle, Circle, Text, and Eraser
- Responsive Konva stage and a future-facing AI assistant panel

## Frontend structure

- `src/types/canvas.ts`: canvas domain types
- `src/hooks/useCanvas.ts`: drawing state, actions, and persistence
- `src/components/Canvas.tsx`: Konva stage and line rendering
- `src/components/Toolbar.tsx`: tool and action controls
- `src/components/AIPanel.tsx`: placeholder AI interface
- `src/App.tsx`: page composition
