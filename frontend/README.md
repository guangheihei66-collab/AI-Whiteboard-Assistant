# AI Whiteboard Assistant Frontend

The frontend is a Vite, React, and TypeScript application that renders an interactive Konva whiteboard with structured AI analysis and preview-first generation.

## Start locally

```bash
npm install
npm run dev
```

Vite normally opens at `http://localhost:5173`. Start the backend separately to use AI analysis.

To override the backend URL, copy `.env.example` to `.env.local` and edit `VITE_API_BASE_URL`. Never place an OpenAI key in any frontend environment file.

## Commands

```bash
npm run lint
npm run build
npm run test:e2e
npm run preview
```

## Features

- Pen, Rectangle, Circle, Text, Eraser, and Select tools
- Move, resize, rotate, delete, layer order, Undo/Redo, Save/Load, auto-save, and PNG export
- Guarded keyboard shortcuts that do not fire while typing in the AI panel
- AI question input, loading state, duplicate-submit protection, Cancel, Retry, and safe errors
- Mock/Live label and structured Summary, Element Counts, Observations, Suggestions, and Next Actions
- Analyze and Generate modes in the AI panel
- Preview-first generation for flowcharts, mind maps, architecture sketches, study plans, and notes
- Dashed translucent Konva previews with Apply, Regenerate, and Cancel actions
- Batch Apply with one-step Undo/Redo and automatic selection of the first generated element
- Runtime validation of backend AI responses and no raw HTML rendering

## Frontend structure

- `src/types/canvas.ts`: canvas domain types
- `src/types/ai.ts`: AI response contracts
- `src/services/ai.ts`: cancellable backend client and response validation
- `src/utils/normalizeGeneratedElements.ts`: generated-proposal bounds and security validation
- `src/hooks/useCanvas.ts`: selection, history, and canvas actions
- `src/hooks/useKeyboardShortcuts.ts`: guarded global keyboard commands
- `src/hooks/useAutoSave.ts`: debounced persistence
- `src/utils/`: versioned storage migration and element validation
- `src/components/AIPanel.tsx`: structured AI analysis interface
- `src/components/AIGenerationPreview.tsx`: non-interactive proposal overlay
- `src/App.tsx`: page composition only
