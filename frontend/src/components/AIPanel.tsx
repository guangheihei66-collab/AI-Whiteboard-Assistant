import {
  AlertCircle,
  Bot,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Square,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { analyzeWhiteboard, AIServiceError } from '../services/ai'
import type { AIAnalysis, AIMode } from '../types/ai'
import type { CanvasElement, ElementType } from '../types/canvas'

interface AIPanelProps {
  statusMessage: string
  elements: CanvasElement[]
}

interface ResultListProps {
  title: string
  items: string[]
}

const elementTypes: ElementType[] = ['line', 'rectangle', 'circle', 'text']

function ResultList({ title, items }: ResultListProps) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-5 text-slate-700">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-400">No items returned.</p>
      )}
    </section>
  )
}

const friendlyError = (error: unknown) => {
  if (!(error instanceof AIServiceError)) {
    return 'AI analysis is temporarily unavailable. Please try again.'
  }
  if (error.code === 'AI_NOT_CONFIGURED') {
    return 'Live AI is not configured. Check the backend environment variables and restart it.'
  }
  if (error.code === 'NETWORK_ERROR') {
    return 'Unable to reach the AI service. Start the backend with npm run dev and try again.'
  }
  return error.message
}

export function AIPanel({ statusMessage, elements }: AIPanelProps) {
  const [message, setMessage] = useState('Analyze this whiteboard.')
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [mode, setMode] = useState<AIMode | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastSubmittedMessage, setLastSubmittedMessage] = useState('Analyze this whiteboard.')
  const activeRequestRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      activeRequestRef.current?.abort()
    },
    [],
  )

  const runAnalysis = useCallback(
    async (requestedMessage: string) => {
      const trimmedMessage = requestedMessage.trim()
      if (!trimmedMessage || activeRequestRef.current) return

      const controller = new AbortController()
      activeRequestRef.current = controller
      setLastSubmittedMessage(trimmedMessage)
      setIsLoading(true)
      setErrorMessage('')
      setNoticeMessage('')

      try {
        const result = await analyzeWhiteboard({
          message: trimmedMessage,
          elements,
          signal: controller.signal,
        })
        setAnalysis(result.analysis)
        setMode(result.mode)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setNoticeMessage('Analysis cancelled.')
        } else {
          setAnalysis(null)
          setMode(null)
          setErrorMessage(friendlyError(error))
        }
      } finally {
        if (activeRequestRef.current === controller) activeRequestRef.current = null
        setIsLoading(false)
      }
    },
    [elements],
  )

  const handleAnalyze = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runAnalysis(message)
  }

  const handleCancel = () => activeRequestRef.current?.abort()

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
          <Bot size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">AI Assistant</h2>
          <p className="text-xs text-slate-500">Secure whiteboard analysis</p>
        </div>
        {mode && (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
              mode === 'live'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {mode}
          </span>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="rounded-2xl rounded-tl-md bg-slate-100 p-4 text-sm leading-6 text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-medium text-slate-800">
            <Sparkles size={15} className="text-violet-600" />
            Whiteboard helper
          </div>
          Ask for a concise summary, observations, improvements, and practical next actions. The AI
          can analyze the board but cannot modify it.
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
            Canvas status
          </p>
          <p className="mt-1 text-sm text-indigo-900" role="status">
            {statusMessage}
          </p>
          {elements.length === 0 && (
            <p className="mt-1 text-xs text-indigo-700">
              The whiteboard is empty, but it can still be analyzed.
            </p>
          )}
        </div>

        {noticeMessage && (
          <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
            {noticeMessage}
          </p>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800"
          >
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 shrink-0" size={16} />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => void runAnalysis(lastSubmittedMessage)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-100"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        )}

        {analysis && (
          <section
            className="space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4"
            aria-label="AI analysis"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-violet-950">Analysis result</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                {mode} mode
              </span>
            </div>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Summary</h4>
              <p className="mt-2 text-sm leading-5 text-slate-700">{analysis.summary}</p>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Element Counts
              </h4>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {elementTypes.map((type) => (
                  <div key={type} className="rounded-lg bg-white px-2.5 py-2 text-slate-600">
                    <span className="capitalize">{type}</span>
                    <strong className="float-right text-slate-900">
                      {analysis.elementCounts[type]}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <ResultList title="Observations" items={analysis.observations} />
            <ResultList title="Suggestions" items={analysis.suggestions} />
            <ResultList title="Next Actions" items={analysis.nextActions} />
          </section>
        )}
      </div>

      <form onSubmit={handleAnalyze} className="space-y-2 border-t border-slate-200 p-4">
        <label htmlFor="ai-message" className="sr-only">
          Whiteboard analysis question
        </label>
        <textarea
          id="ai-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={500}
          rows={3}
          required
          placeholder="Ask about the current whiteboard..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || message.trim().length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {isLoading ? 'Analyzing...' : 'Analyze Whiteboard'}
          </button>
          {isLoading && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Square size={13} fill="currentColor" />
              Cancel
            </button>
          )}
        </div>
        <p className="text-center text-[11px] text-slate-400">
          Mode is controlled securely by the backend.
        </p>
      </form>
    </aside>
  )
}
