import { AlertCircle, Bot, LoaderCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { CanvasElement, ElementType } from '../types/canvas'

interface AIPanelProps {
  statusMessage: string
  elements: CanvasElement[]
}

interface MockAnalysis {
  totalElements: number
  counts: Record<ElementType, number>
  summary: string
  suggestions: string[]
}

interface AnalyzeResponse {
  analysis: MockAnalysis
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
)

export function AIPanel({ statusMessage, elements }: AIPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [analysis, setAnalysis] = useState<MockAnalysis | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements, prompt }),
      })

      if (!response.ok) {
        throw new Error(`Mock AI service returned ${response.status}.`)
      }

      const data = (await response.json()) as AnalyzeResponse
      setAnalysis(data.analysis)
    } catch {
      setAnalysis(null)
      setErrorMessage(
        'Unable to reach the mock AI service. Start the backend with npm run dev and try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
          <Bot size={19} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">AI Assistant</h2>
          <p className="text-xs text-emerald-600">Mock analysis service</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="rounded-2xl rounded-tl-md bg-slate-100 p-4 text-sm leading-6 text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-medium text-slate-800">
            <Sparkles size={15} className="text-violet-600" />
            Whiteboard helper
          </div>
          Analyze the current board to count its elements and receive simple organization tips. No
          real AI provider is connected.
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
            Canvas status
          </p>
          <p className="mt-1 text-sm text-indigo-900" role="status">
            {statusMessage}
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            {errorMessage}
          </div>
        )}

        {analysis && (
          <section className="rounded-xl border border-violet-200 bg-violet-50 p-4" aria-label="Mock analysis">
            <h3 className="text-sm font-semibold text-violet-950">Mock analysis</h3>
            <p className="mt-1 text-sm text-violet-800">{analysis.summary}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {Object.entries(analysis.counts).map(([type, count]) => (
                <div key={type} className="rounded-lg bg-white px-2.5 py-2 text-slate-600">
                  <span className="capitalize">{type}</span>
                  <strong className="float-right text-slate-900">{count}</strong>
                </div>
              ))}
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-5 text-violet-900">
              {analysis.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <form onSubmit={handleAnalyze} className="space-y-2 border-t border-slate-200 p-4">
        <label htmlFor="ai-prompt" className="sr-only">
          Optional analysis context
        </label>
        <input
          id="ai-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Optional context for the board..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        >
          {isLoading ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {isLoading ? 'Analyzing...' : 'Analyze Whiteboard'}
        </button>
        <p className="text-center text-[11px] text-slate-400">Uses a local deterministic mock response.</p>
      </form>
    </aside>
  )
}
