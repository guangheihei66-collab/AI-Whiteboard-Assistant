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
        currentColor={canvas.currentColor}
        strokeWidth={canvas.strokeWidth}
        hasSelection={Boolean(canvas.selectedElementId)}
        canUndo={canvas.canUndo}
        canRedo={canvas.canRedo}
        canBringForward={canvas.canBringForward}
        canSendBackward={canvas.canSendBackward}
        onToolChange={canvas.setCurrentTool}
        onColorChange={canvas.setCurrentColor}
        onStrokeWidthChange={canvas.setStrokeWidth}
        onUndo={canvas.undo}
        onRedo={canvas.redo}
        onDeleteSelected={canvas.deleteSelected}
        onBringForward={canvas.bringForward}
        onSendBackward={canvas.sendBackward}
        onClear={canvas.clear}
        onSave={canvas.save}
        onLoad={canvas.load}
        onExportPng={canvas.exportPng}
      />

      <Canvas
        elements={canvas.elements}
        previewElements={canvas.previewElements}
        currentTool={canvas.currentTool}
        selectedElementId={canvas.selectedElementId}
        selectedElement={canvas.selectedElement}
        stageRef={canvas.stageRef}
        onDrawStart={canvas.startDrawing}
        onDrawMove={canvas.continueDrawing}
        onDrawEnd={canvas.endDrawing}
        onSelect={canvas.selectElement}
        onMove={canvas.moveElement}
        onTransform={canvas.transformElement}
        onErase={canvas.eraseElement}
        onSizeChange={canvas.updateCanvasSize}
      />

      <AIPanel
        statusMessage={canvas.statusMessage}
        elements={canvas.elements}
        canvasSize={canvas.canvasSize}
        onPreviewElements={canvas.setAIPreview}
        onClearPreview={canvas.clearAIPreview}
        onApplyPreview={canvas.applyAIPreview}
      />
    </main>
  )
}

export default App
