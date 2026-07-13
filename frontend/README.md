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

## Whiteboard features

- Freehand Pen, Rectangle, center-radius Circle, prompt-based Text, and click Eraser tools
- Select mode with movement for all elements and Transformer editing for shapes and text
- Rectangle, ellipse-compatible Circle, and Text resize/rotate controls
- Shared color and stroke-width controls
- Undo/Redo for creation, movement, transforms, deletion, layers, and Clear
- Keyboard tools, Delete/Backspace, Escape, Save, Undo, and Redo shortcuts
- Bring Forward and Send Backward layer actions
- Debounced auto-save, automatic recovery, and manual Save/Load
- Backward-compatible loading of version 1 and version 2 saves
- Export the whiteboard as a PNG image
- Responsive Konva stage and a mock AI analysis panel backed by the local Express service

To use Analyze Whiteboard, also start the backend from `../backend` with `npm install` and `npm run dev`.

## Frontend structure

- `src/types/canvas.ts`: canvas domain types
- `src/hooks/useCanvas.ts`: selection, history, and canvas actions
- `src/hooks/useKeyboardShortcuts.ts`: guarded global keyboard commands
- `src/hooks/useAutoSave.ts`: debounced persistence
- `src/utils/storage.ts`: versioned serialization and migration
- `src/utils/elementGuards.ts`: runtime data validation
- `src/components/Canvas.tsx`: Konva stage and element rendering
- `src/components/SelectionTransformer.tsx`: resize and rotate controls
- `src/components/Toolbar.tsx`: tool and action controls
- `src/components/AIPanel.tsx`: placeholder AI interface
- `src/App.tsx`: page composition
