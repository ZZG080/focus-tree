// 历史视图 V6：森林统计 + 森林地图 + 树种图鉴收集 + 专注记录列表
// V6 新增：森林地图（2D 网格可视化森林）+ 挑战模式双倍奖励标记
import { useEffect, useMemo, useState } from 'react'
import type { FocusRecord } from '../types'
import { getRecordsAsync } from '../services/storageService'
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
  storm: '⛈️',
}

/** 按树种 id 取 emoji（图鉴对照） */
function speciesEmoji(id?: string): string {
  if (!id) return '🌳'
  const sp = TREE_SPECIES.find((s) => s.id === id)
  return sp?.emoji ?? '🌳'
}

/** 天气中文名 */
function weatherName(w?: string): string {
  if (w === 'rainy') return '雨天'
  if (w === 'snowy') return '雪天'
  if (w === 'storm') return '暴风雨挑战'
  return '晴天'
}

export function HistoryView({ onBack }: HistoryViewProps) {
  const [records, setRecords] = useState<FocusRecord[]>([])

  useEffect(() => {
    let alive = true
    getRecordsAsync().then((rs) => {
      if (alive) setRecords(rs)
    })
    return () => {
      alive = false
    }
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
        <div className="eyebrow">FOREST · 森林</div>
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

      {/* 森林地图：2D 网格可视化——每格一棵会话树，形成真正的森林 */}
      {records.length > 0 && (
        <div className="forest-map-panel">
          <div className="collection-header">
            <h2>🗺️ 森林地图</h2>
            <span className="collection-progress">最近 {Math.min(records.length, 48)} 次专注</span>
          </div>
          <div className="forest-map" role="img" aria-label={`森林地图：共 ${records.length} 棵树`}>
            {records.slice(0, 48).map((r, i) => {
              const n = r.treeCount ?? 1
              const isStorm = r.weather === 'storm' || r.challengeBonus
              return (
                <div
                  key={r.id}
                  className={`map-cell ${i % 2 === 0 ? 'row-a' : 'row-b'} ${isStorm ? 'storm-cell' : ''}`}
                  title={`${formatDate(r.startedAt)} · ${r.actualMinutes} 分钟 · ${n} 棵树${isStorm ? ' · ⚡挑战' : ''}`}
                >
                  <span className="map-tree">{speciesEmoji(r.speciesId)}</span>
                  {n > 1 && <span className="map-count">×{n}</span>}
                  {isStorm && <span className="map-storm">⚡</span>}
                </div>
              )
            })}
            {records.length > 48 && <div className="map-more">… 还有 {records.length - 48} 棵</div>}
          </div>
        </div>
      )}

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
                      {r.challengeBonus ? ' ⚡挑战双倍' : ''}
                      {r.completed ? '' : '（提前结束）'}
                    </div>
                    <div className="record-sub">
                      {formatDate(r.startedAt)} · 计划 {r.plannedMinutes} 分钟
                      {r.weather ? ` · ${WEATHER_ICON[r.weather] ?? ''}${weatherName(r.weather)}` : ''}
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
