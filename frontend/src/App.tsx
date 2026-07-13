import { AIPanel } from './components/AIPanel'
import { Canvas } from './components/Canvas'
import { Toolbar } from './components/Toolbar'
import { useCanvas } from './hooks/useCanvas'

function App() {
  const canvas = useCanvas()

  return (
    <main className="flex h-screen min-h-[640px] min-w-[980px] gap-4 overflow-x-auto bg-slate-100 p-4 text-slate-900">
      <Toolbar
        currentTool={canvas.currentTool}
        onToolChange={canvas.setCurrentTool}
        onUndo={canvas.undo}
        onClear={canvas.clear}
        onSave={canvas.save}
        onLoad={canvas.load}
        canUndo={canvas.lines.length > 0}
      />

      <Canvas
        lines={canvas.lines}
        currentTool={canvas.currentTool}
        onDrawStart={canvas.startDrawing}
        onDrawMove={canvas.continueDrawing}
        onDrawEnd={canvas.endDrawing}
      />

      <AIPanel statusMessage={canvas.statusMessage} />
    </main>
  )
}

export default App
