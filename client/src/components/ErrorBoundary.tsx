import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Konsola yazırıq ki, development zamanı debug rahat olsun.
    console.error('[ErrorBoundary] Tutulmuş xəta:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D] px-4">
        <div
          className="max-w-md w-full text-center rounded-3xl p-8"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="text-6xl mb-4">😵‍💫</div>
          <h1 className="text-white font-black text-2xl mb-2">
            Nəsə yanlış getdi
          </h1>
          <p className="text-[#9CA3AF] text-sm mb-6">
            Gözlənilməz xəta baş verdi. Səhifəni yeniləməyi yoxla — məlumatların
            itirilmir.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre
              className="text-left text-[11px] text-red-300 mb-6 p-3 rounded-xl overflow-auto max-h-40"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {this.state.error.message}
            </pre>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #9333EA, #6366F1)' }}
            >
              🔄 Səhifəni yenilə
            </button>
            <button
              onClick={this.handleHome}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold text-[#9CA3AF] border border-white/10 hover:text-white transition-colors"
            >
              🏠 Ana səhifə
            </button>
          </div>
        </div>
      </div>
    )
  }
}
