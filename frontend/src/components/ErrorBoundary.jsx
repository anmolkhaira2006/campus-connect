import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Campus Connect Application Error caught by boundary:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    try {
      sessionStorage.clear()
    } catch {}
    window.location.href = '/events'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <span className="material-symbols-outlined text-3xl">terminal</span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-1">
                System Interface Recovery
              </span>
              <h2 className="font-headline text-xl font-bold text-white">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                A client interface exception was captured safely. Your session and event registrations are secure.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-rose-400 text-left overflow-x-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-headline text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-headline text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">home</span>
                <span>Events Portal</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
