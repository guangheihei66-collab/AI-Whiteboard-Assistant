import { AIPanel } from './components/AIPanel'
import { Canvas } from './components/Canvas'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toolbar } from './components/Toolbar'
import { useCanvas } from './hooks/useCanvas'

function App() {
  const canvas = useCanvas()

  return (
    <main className="flex min-h-screen flex-col gap-3 overflow-x-hidden bg-slate-100 p-3 text-slate-900 lg:h-screen lg:min-h-[640px] lg:min-w-[980px] lg:flex-row lg:gap-4 lg:overflow-x-auto lg:p-4">
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

      <ErrorBoundary
        fallback={
          <section
            role="alert"
            className="flex min-h-[320px] min-w-0 flex-1 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm lg:min-h-0 lg:max-w-[360px]"
          >
            <p className="text-sm font-semibold text-slate-900">AI Assistant is temporarily unavailable.</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              The whiteboard is still safe. Reload this page to restore the assistant panel.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Reload assistant
            </button>
          </section>
        }
      >
        <AIPanel
          statusMessage={canvas.statusMessage}
          elements={canvas.elements}
          canvasSize={canvas.canvasSize}
          onPreviewElements={canvas.setAIPreview}
          onClearPreview={canvas.clearAIPreview}
          onApplyPreview={canvas.applyAIPreview}
        />
      </ErrorBoundary>
    </main>
  )
}

export default App
