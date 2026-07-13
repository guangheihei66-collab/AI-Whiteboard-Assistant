import { Bot, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'

interface AIPanelProps {
  statusMessage: string
}

export function AIPanel({ statusMessage }: AIPanelProps) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPrompt('')
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
          <Bot size={19} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">AI Assistant</h2>
          <p className="text-xs text-emerald-600">Future-ready</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="rounded-2xl rounded-tl-md bg-slate-100 p-4 text-sm leading-6 text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-medium text-slate-800">
            <Sparkles size={15} className="text-violet-600" />
            Welcome
          </div>
          In a future phase, I can analyze your whiteboard, summarize ideas, and suggest next steps.
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
            Canvas status
          </p>
          <p className="mt-1 text-sm text-indigo-900" role="status">
            {statusMessage}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4">
        <label htmlFor="ai-prompt" className="sr-only">
          Ask the AI assistant
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
          <input
            id="ai-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask about your board..."
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            aria-label="Send message"
            title="AI requests will be available in a future phase"
            className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">AI connection is not enabled yet.</p>
      </form>
    </aside>
  )
}
