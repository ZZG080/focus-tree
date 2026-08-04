// 历史视图 V5：森林统计 + 树种图鉴收集 + 专注记录列表
import { useEffect, useMemo, useState } from 'react'
import type { FocusRecord } from '../types'
import { getRecords } from '../services/storageService'
import { TREE_SPECIES } from '../services/treeSpecies'

interface HistoryViewProps {
  onBack: () => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const WEATHER_ICON: Record<string, string> = {
  sunny: '☀️',
  rainy: '🌧️',
  snowy: '❄️',
}

export function HistoryView({ onBack }: HistoryViewProps) {
  const [records, setRecords] = useState<FocusRecord[]>([])

  useEffect(() => {
    setRecords(getRecords())
  }, [])

  const stats = useMemo(() => {
    const totalTrees = records.reduce((sum, r) => sum + (r.treeCount ?? 1), 0)
    const totalMinutes = records.reduce((sum, r) => sum + r.actualMinutes, 0)
    const completedCount = records.filter((r) => r.completed).length
    // 解锁计算：已完成次数 + 累计分钟
    const unlockedIds = new Set<string>(['oak'])
    for (const s of TREE_SPECIES) {
      if (s.id === 'oak') continue
      const c = s.unlock
      if (!c) continue
      const pass =
        (c.completedCount !== undefined && completedCount >= c.completedCount) ||
        (c.totalMinutes !== undefined && totalMinutes >= c.totalMinutes)
      if (pass) unlockedIds.add(s.id)
    }
    return { totalTrees, totalMinutes, completedCount, sessions: records.length, unlockedIds }
  }, [records])

  const handleClear = () => {
    if (confirm('确定清空所有专注记录吗？（已解锁的树种会保留）')) {
      // 清记录需要引用 clearRecords —— 用动态导入避免循环，这里直接内联实现
      try {
        localStorage.removeItem('focus-tree:records')
      } catch {
        /* ignore */
      }
      setRecords([])
    }
  }

  return (
    <div className="history-view">
      <div className="history-header">
        <h1>📖 我的森林</h1>
        <button className="ghost-btn" onClick={onBack}>← 返回</button>
      </div>

      {/* 森林总览 */}
      <div className="forest-banner">
        <div className="forest-canopy">
          {Array.from({ length: Math.min(stats.totalTrees, 40) }).map((_, i) => (
            <span key={i} className={`canopy-tree ${i % 3 === 0 ? 'big' : i % 3 === 1 ? 'mid' : 'small'}`}>
              🌳
            </span>
          ))}
          {stats.totalTrees === 0 && <span className="canopy-empty">🌱</span>}
        </div>
        <div className="forest-count" title={`累计种下 ${stats.totalTrees} 棵树`}>
          <span className="count-num">{stats.totalTrees}</span>
          <span className="count-label">已种树总数</span>
        </div>
      </div>

      {/* 树种图鉴 */}
      <div className="collection-panel">
        <div className="collection-header">
          <h2>🌲 树种图鉴</h2>
          <span className="collection-progress">{stats.unlockedIds.size} / {TREE_SPECIES.length}</span>
        </div>
        <div className="collection-grid">
          {TREE_SPECIES.map((s) => {
            const unlocked = stats.unlockedIds.has(s.id)
            return (
              <div key={s.id} className={`collection-card ${unlocked ? '' : 'locked'}`}>
                <div className="collection-emoji">{unlocked ? s.emoji : '🔒'}</div>
                <div className="collection-name">{s.name}</div>
                <div className="collection-desc">{unlocked ? s.desc : s.unlockHint}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <div className="stat-num">{stats.sessions}</div>
          <div className="stat-label">专注次数</div>
        </div>
        <div className="stat">
          <div className="stat-num">{Math.round(stats.totalMinutes)}</div>
          <div className="stat-label">总专注分钟</div>
        </div>
        <div className="stat">
          <div className="stat-num">{Math.round(stats.totalMinutes / 25)}</div>
          <div className="stat-label">≈ 番茄数</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.completedCount}</div>
          <div className="stat-label">完整完成</div>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="empty-hint">还没有专注记录，去种下第一棵树吧 🌱</p>
      ) : (
        <>
          <ul className="record-list">
            {records.map((r) => (
              <li key={r.id} className={`record-item ${r.completed ? '' : 'incomplete'}`}>
                <div className="record-left">
                  <span className="record-icon">{r.completed ? '🌳' : '🌱'}</span>
                  <div>
                    <div className="record-title">
                      {r.actualMinutes} 分钟 · {r.treeCount ?? 1} 棵树
                      {r.completed ? '' : '（提前结束）'}
                    </div>
                    <div className="record-sub">
                      {formatDate(r.startedAt)} · 计划 {r.plannedMinutes} 分钟
                      {r.weather ? ` · ${WEATHER_ICON[r.weather] ?? ''}${r.weather === 'rainy' ? '雨天' : r.weather === 'snowy' ? '雪天' : '晴天'}` : ''}
                    </div>
                  </div>
                </div>
                {r.encouragement && (
                  <div className="record-msg">“{r.encouragement}”</div>
                )}
              </li>
            ))}
          </ul>
          <button className="clear-btn" onClick={handleClear}>清空记录</button>
        </>
      )}
    </div>
  )
}
