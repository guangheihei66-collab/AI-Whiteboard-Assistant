import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('The whiteboard UI encountered a rendering error.', error)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-900">
        <section
          role="alert"
          className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm"
        >
          <AlertTriangle className="mx-auto text-rose-600" size={36} aria-hidden="true" />
          <h1 className="mt-4 text-lg font-semibold">The whiteboard could not be displayed</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your locally saved canvas has not been deleted. Reload the page to try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Reload
          </button>
        </section>
      </main>
    )
  }
}
