# Whiteboard Shapes and Mock AI Integration Design

## Scope and delivery

This work extends the existing MVP in two independently verified stages. Stage two adds basic shape editing and PNG export. Stage three adds a local Express service and connects the existing AI panel to a deterministic mock analysis endpoint. No real AI provider, API key, authentication, database, collaboration, or cloud storage is introduced.

Each stage must preserve the current Pen, Undo, Clear, Save, and Load behavior, pass its relevant builds and browser checks, and receive its own requested Git commit.

## Stage two: unified canvas elements

### Data model

Canvas data becomes a discriminated `CanvasElement` union stored in one ordered `elements` array:

- `LineElement`: `type`, ID, flat point array, color, and stroke width.
- `RectangleElement`: `type`, ID, x/y position, width, height, color, and stroke width.
- `CircleElement`: `type`, ID, center x/y, radius, color, and stroke width.
- `TextElement`: `type`, ID, x/y position, text, color, and font size.

The shared order is the render order and the Undo order. Persisted state advances to version 2. Loading version 1 data migrates existing line records into version 2 elements so prior local saves remain usable.

### Interaction model

`useCanvas` owns the selected tool, selected color, stroke width, ordered elements, active drawing state, storage, deletion, and export behavior.

- Pen creates a line on pointer down and appends points during movement.
- Rectangle records its pointer-down origin and updates a normalized bounding box during movement, including drags toward the left or upward.
- Circle treats pointer down as the center and uses pointer distance as the radius.
- Text prompts for content on canvas click and creates a text element only when non-empty text is entered.
- Eraser does not create elements. Clicking any rendered element removes it by ID.

Switching tools ends any active drawing gesture. Pointer up and pointer leave complete the active element. Undo removes the last element; Clear removes all elements. Save and Load operate on the entire versioned array.

### Rendering and export

`Canvas.tsx` renders the union using Konva `Line`, `Rect`, `Circle`, and `Text` nodes. It forwards stage pointer events and element-click IDs without owning business state. Konva nodes listen for clicks only while Eraser is active.

The hook owns a Konva Stage reference used to export the whiteboard as a PNG through `toDataURL`. The generated file uses a descriptive timestamped name. The visual canvas receives an opaque white background so exported images do not rely on transparency.

`Toolbar.tsx` adds an HTML color input, a bounded stroke-width control, and an Export PNG action. Pen, Rectangle, Circle, and Text use the current color. Pen, Rectangle, and Circle use the current stroke width.

### Stage-two validation

Playwright must verify the three-column layout, pen drawing, rectangle drawing, center-based circle drawing, prompt-based text creation, erasing every supported element type, Undo, Clear, Save/Load for mixed elements, tool styling controls, and PNG download. The production build must pass before the stage-two commit:

`Add basic shape tools and export feature`

## Stage three: mock AI service

### Backend

The backend becomes a standalone Node.js, Express, and TypeScript package with:

- `src/index.ts` for application setup, CORS, JSON parsing, health behavior, and server startup.
- `src/routes/ai.ts` for `POST /api/ai/analyze`.
- `package.json`, `package-lock.json`, and `tsconfig.json` for reproducible development and build commands.

The endpoint accepts `{ elements: CanvasElementLike[] }`. It rejects a missing or non-array `elements` value with HTTP 400. Valid requests return a mock result containing total count, counts for line, rectangle, circle, and text, plus deterministic suggestions based on the content. It does not inspect environment variables for an AI key or make outbound AI requests.

### Frontend integration

`AIPanel.tsx` receives the current elements from `App.tsx`. Analyze Whiteboard sends them to `${VITE_API_BASE_URL ?? "http://localhost:3001"}/api/ai/analyze`. The panel displays an in-progress state, the returned counts and suggestions, and a friendly message when the backend is unavailable. The free-form input remains a future-facing UI field and is not sent to a real model.

### Documentation and security

The root README documents frontend and backend installation, development, build, completed features, and the mock nature of the AI response. A `.env.example` may document a port or frontend base URL but must contain no secret. Root and package ignore rules cover `.env`, `.env.local`, dependency folders, builds, test artifacts, and OS files.

Security verification scans source and configuration files for likely API keys, passwords, tokens, and secrets without printing secret values. Git status and staged contents must confirm that no dependency directories, build directories, or environment files are committed.

### Stage-three validation

The frontend production build and backend build or typecheck must pass. Browser automation starts both services, submits mixed elements, verifies returned category counts, and separately verifies the friendly backend-unavailable state. The resulting Playwright trace must contain no unexplained browser errors or failed application requests during the success path.

Stage three is committed independently as:

`Add mock AI assistant backend integration`

## Error handling and non-goals

Malformed localStorage data leaves the current canvas unchanged and produces a status message. Cancelled text prompts create no element. Failed PNG export and failed backend requests are reported in the UI without crashing the application. Backend input errors return JSON with a clear error field.

Selection, movement, resizing, shape fills, multiline text editing, real AI calls, user accounts, databases, collaboration, uploads, pan/zoom, and cloud persistence remain outside this work.
