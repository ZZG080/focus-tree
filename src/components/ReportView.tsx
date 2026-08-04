// 周报视图：AI 每周专注总结（基于真实数据）
import { useEffect, useState } from 'react'
import { getRecords } from '../services/storageService'
import { generateWeeklyReport } from '../services/aiService'

interface ReportViewProps {
  onBack: () => void
}

export function ReportView({ onBack }: ReportViewProps) {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<{ title: string; content: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    generateWeeklyReport(getRecords()).then((r) => {
      if (!cancelled) {
        setReport(r)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const regenerate = () => {
    setLoading(true)
    setReport(null)
    generateWeeklyReport(getRecords()).then((r) => {
      setReport(r)
      setLoading(false)
    })
  }

  return (
    <div className="report-view">
      <div className="history-header">
        <h1>📈 周报</h1>
        <button className="ghost-btn" onClick={onBack}>← 返回</button>
      </div>

      <div className="report-card">
        {loading ? (
          <div className="report-loading">
            <span className="report-spinner" />
            <p>AI 正在分析你的专注数据…</p>
          </div>
        ) : report ? (
          <>
            <h2>{report.title}</h2>
            <div className="report-content">{report.content}</div>
            <button className="save-btn" onClick={regenerate}>🔄 重新生成</button>
            <p className="report-hint">
              💡 配置 API Key 后，周报将由 AI 基于你的真实数据生成个性化分析（最佳时段、趋势、建议）
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
