// 错误边界：树渲染崩溃时不让整个应用锁死，保证计时器/退出按钮可用
import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** 崩溃时的兜底 UI */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(err: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    }
  }

  componentDidCatch(err: unknown) {
    // 上报/日志（生产可接监控）
    console.error('[ErrorBoundary] 渲染崩溃:', err)
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="result-view">
          <div className="result-card">
            <h2>😵 出错了</h2>
            <p className="result-msg" role="alert">
              场景渲染遇到了问题，但你的专注计时不受影响。点击下方按钮安全退出。
              <br />
              <small style={{ color: '#c0392b' }}>{this.state.message}</small>
            </p>
            <div className="result-actions">
              <button className="start-btn" onClick={this.handleReset}>🔄 重试</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
