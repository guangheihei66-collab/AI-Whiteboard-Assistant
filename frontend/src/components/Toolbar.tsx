import {
  Circle,
  Download,
  Eraser,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Save,
  Square,
  Trash2,
  Type,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { ToolType } from '../types/canvas'

interface ToolbarProps {
  currentTool: ToolType
  onToolChange: (tool: ToolType) => void
  onUndo: () => void
  onClear: () => void
  onSave: () => void
  onLoad: () => void
  canUndo: boolean
}

interface ToolItem {
  type: ToolType
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
}

const tools: ToolItem[] = [
  { type: 'pen', label: 'Pen', icon: Pencil },
  { type: 'rectangle', label: 'Rectangle', icon: Square },
  { type: 'circle', label: 'Circle', icon: Circle },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'eraser', label: 'Eraser', icon: Eraser },
]

const baseButton =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'

export function Toolbar({
  currentTool,
  onToolChange,
  onUndo,
  onClear,
  onSave,
  onLoad,
  canUndo,
}: ToolbarProps) {
  return (
    <aside className="flex w-48 shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex h-12 items-center gap-2 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">
          <MousePointer2 size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold">Whiteboard</p>
          <p className="text-[11px] text-slate-400">MVP workspace</p>
        </div>
      </div>

      <Minus className="my-3 w-full text-slate-200" />
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Tools
      </p>

      <div className="space-y-1">
        {tools.map(({ type, label, icon: Icon }) => {
          const isSelected = currentTool === type
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToolChange(type)}
              className={`${baseButton} ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </button>
          )
        })}
      </div>

      <Minus className="my-3 w-full text-slate-200" />
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Canvas
      </p>

      <div className="space-y-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`${baseButton} text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Redo2 className="-scale-x-100" size={17} />
          Undo
        </button>
        <button
          type="button"
          onClick={onClear}
          className={`${baseButton} text-slate-600 hover:bg-slate-100`}
        >
          <Trash2 size={17} />
          Clear
        </button>
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <button
          type="button"
          onClick={onSave}
          className={`${baseButton} justify-center border border-slate-200 text-slate-700 hover:bg-slate-50`}
        >
          <Save size={16} />
          Save
        </button>
        <button
          type="button"
          onClick={onLoad}
          className={`${baseButton} justify-center bg-slate-900 text-white hover:bg-slate-700`}
        >
          <Download size={16} />
          Load
        </button>
      </div>
    </aside>
  )
}
