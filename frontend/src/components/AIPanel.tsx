import {
  AlertCircle,
  Bot,
  Check,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Square,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  analyzeWhiteboard,
  AIServiceError,
  generateWhiteboard,
} from '../services/ai'
import type {
  AIAnalysis,
  AIMode,
  CanvasDimensions,
  GenerationProposal,
} from '../types/ai'
import type { CanvasElement, ElementType } from '../types/canvas'

type AssistantMode = 'analyze' | 'generate'

interface AIPanelProps {
  statusMessage: string
  elements: CanvasElement[]
  canvasSize: CanvasDimensions
  onPreviewElements: (elements: CanvasElement[]) => void
  onClearPreview: () => void
  onApplyPreview: () => void
}

interface ResultListProps {
  title: string
  items: string[]
}

interface GenerationProposalCardProps {
  proposal: GenerationProposal
  mode: AIMode
  onApply: () => void
  onRegenerate: () => void
  onCancel: () => void
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

function AnalysisResult({ analysis, mode }: { analysis: AIAnalysis; mode: AIMode }) {
  return (
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
  )
}

function GenerationProposalCard({
  proposal,
  mode,
  onApply,
  onRegenerate,
  onCancel,
}: GenerationProposalCardProps) {
  return (
    <section
      data-testid="ai-generation-proposal"
      className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4"
      aria-label="AI generation proposal"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-indigo-950">{proposal.title}</h3>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase text-indigo-600">
          {mode}
        </span>
      </div>
      <p className="text-sm leading-5 text-indigo-900">{proposal.description}</p>
      <div className="rounded-lg border border-dashed border-indigo-300 bg-white/70 p-2.5 text-xs text-indigo-800">
        Previewing {proposal.elements.length} elements. The canvas has not changed yet.
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onApply}
          className="col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          <Check size={14} />
          Apply to Canvas
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          Regenerate
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
        >
          <X size={13} />
          Cancel Preview
        </button>
      </div>
    </section>
  )
}

const friendlyError = (error: unknown) => {
  if (!(error instanceof AIServiceError)) {
    return 'The AI service is temporarily unavailable. Please try again.'
  }
  if (error.code === 'AI_NOT_CONFIGURED') {
    return 'Live AI is not configured. Check the backend environment variables and restart it.'
  }
  if (error.code === 'NETWORK_ERROR') {
    return 'Unable to reach the AI service. Start the backend with npm run dev and try again.'
  }
  return error.message
}

export function AIPanel({
  statusMessage,
  elements,
  canvasSize,
  onPreviewElements,
  onClearPreview,
  onApplyPreview,
}: AIPanelProps) {
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('analyze')
  const [analysisMessage, setAnalysisMessage] = useState('Analyze this whiteboard.')
  const [generationMessage, setGenerationMessage] = useState('Create a user login flowchart.')
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [proposal, setProposal] = useState<GenerationProposal | null>(null)
  const [resultMode, setResultMode] = useState<AIMode | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastRequest, setLastRequest] = useState<{
    kind: AssistantMode
    message: string
  }>({ kind: 'analyze', message: 'Analyze this whiteboard.' })
  const activeRequestRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      activeRequestRef.current?.abort()
    }
  }, [])

  const clearProposal = useCallback(() => {
    if (proposal) onClearPreview()
    setProposal(null)
  }, [onClearPreview, proposal])

  const runRequest = useCallback(
    async (kind: AssistantMode, requestedMessage: string) => {
      const trimmedMessage = requestedMessage.trim()
      if (!trimmedMessage || activeRequestRef.current) return

      const controller = new AbortController()
      activeRequestRef.current = controller
      setLastRequest({ kind, message: trimmedMessage })
      setIsLoading(true)
      setErrorMessage('')
      setNoticeMessage('')

      if (kind === 'generate') {
        clearProposal()
      }

      try {
        if (kind === 'analyze') {
          const result = await analyzeWhiteboard({
            message: trimmedMessage,
            elements,
            signal: controller.signal,
          })
          if (!isMountedRef.current) return
          setAnalysis(result.analysis)
          setResultMode(result.mode)
        } else {
          const result = await generateWhiteboard({
            message: trimmedMessage,
            canvas: canvasSize,
            existingElements: elements,
            signal: controller.signal,
          })
          if (!isMountedRef.current) return
          setProposal(result.proposal)
          setResultMode(result.mode)
          onPreviewElements(result.proposal.elements)
        }
      } catch (error) {
        if (!isMountedRef.current) return
        if (error instanceof Error && error.name === 'AbortError') {
          setNoticeMessage(`${kind === 'generate' ? 'Generation' : 'Analysis'} cancelled.`)
        } else {
          if (kind === 'analyze') setAnalysis(null)
          else clearProposal()
          setResultMode(null)
          setErrorMessage(friendlyError(error))
        }
      } finally {
        if (activeRequestRef.current === controller) activeRequestRef.current = null
        if (isMountedRef.current) setIsLoading(false)
      }
    },
    [canvasSize, clearProposal, elements, onPreviewElements],
  )

  const handleModeChange = (nextMode: AssistantMode) => {
    activeRequestRef.current?.abort()
    if (assistantMode === 'generate' && nextMode !== 'generate') clearProposal()
    setAssistantMode(nextMode)
    setErrorMessage('')
    setNoticeMessage('')
    setResultMode(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runRequest(
      assistantMode,
      assistantMode === 'analyze' ? analysisMessage : generationMessage,
    )
  }

  const handleApply = () => {
    onApplyPreview()
    setProposal(null)
    setNoticeMessage('Proposal applied as one history step. Undo once to remove the full batch.')
  }

  const handleRegenerate = () => {
    clearProposal()
    void runRequest('generate', lastRequest.kind === 'generate' ? lastRequest.message : generationMessage)
  }

  const handleCancelPreview = () => {
    clearProposal()
    setResultMode(null)
    setNoticeMessage('Preview cancelled. The canvas was not changed.')
  }

  const activeMessage = assistantMode === 'analyze' ? analysisMessage : generationMessage
  const setActiveMessage = assistantMode === 'analyze' ? setAnalysisMessage : setGenerationMessage
  const actionLabel = assistantMode === 'analyze' ? 'Analyze Whiteboard' : 'Generate Whiteboard'
  const loadingLabel = assistantMode === 'analyze' ? 'Analyzing...' : 'Generating...'

  return (
    <aside className="flex min-h-[560px] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:w-80">
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
          <Bot size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">AI Assistant</h2>
          <p className="text-xs text-slate-500">Analyze or propose content</p>
        </div>
        {resultMode && (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
              resultMode === 'live'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {resultMode}
          </span>
        )}
      </header>

      <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-slate-50 p-1.5" role="tablist">
        {(['analyze', 'generate'] as AssistantMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={assistantMode === mode}
            onClick={() => handleModeChange(mode)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-colors ${
              assistantMode === mode
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="rounded-2xl rounded-tl-md bg-slate-100 p-4 text-sm leading-6 text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-medium text-slate-800">
            <Sparkles size={15} className="text-violet-600" />
            {assistantMode === 'analyze' ? 'Whiteboard helper' : 'Generation proposal'}
          </div>
          {assistantMode === 'analyze'
            ? 'Ask for a concise summary and practical next actions. Analysis never changes the canvas.'
            : 'Describe a flowchart, mind map, architecture sketch, study plan, or sticky-note layout. You review every proposal before applying it.'}
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
              The whiteboard is empty, but AI features are still available.
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
              onClick={() => void runRequest(lastRequest.kind, lastRequest.message)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-100"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        )}

        {assistantMode === 'analyze' && analysis && resultMode && (
          <AnalysisResult analysis={analysis} mode={resultMode} />
        )}
        {assistantMode === 'generate' && proposal && resultMode && (
          <GenerationProposalCard
            proposal={proposal}
            mode={resultMode}
            onApply={handleApply}
            onRegenerate={handleRegenerate}
            onCancel={handleCancelPreview}
          />
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 border-t border-slate-200 p-4">
        <label htmlFor="ai-message" className="sr-only">
          {assistantMode === 'analyze'
            ? 'Whiteboard analysis question'
            : 'Whiteboard generation request'}
        </label>
        <textarea
          id="ai-message"
          value={activeMessage}
          onChange={(event) => setActiveMessage(event.target.value)}
          maxLength={500}
          rows={3}
          required
          placeholder={
            assistantMode === 'analyze'
              ? 'Ask about the current whiteboard...'
              : 'Describe the whiteboard you want...'
          }
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || activeMessage.trim().length === 0 || Boolean(proposal)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {isLoading ? loadingLabel : actionLabel}
          </button>
          {isLoading && (
            <button
              type="button"
              onClick={() => activeRequestRef.current?.abort()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Square size={13} fill="currentColor" />
              Cancel Request
            </button>
          )}
        </div>
        <p className="text-center text-[11px] text-slate-400">
          Generation always requires preview and confirmation.
        </p>
      </form>
    </aside>
  )
}
