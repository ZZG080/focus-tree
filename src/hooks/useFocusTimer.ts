// 专注计时 Hook：rAF 帧同步驱动（替代 setInterval 轮询）
// 职责：startedAt/pausedMs/elapsedMs 管理 + 暂停/恢复 + 快照保存与恢复
// 优点：与显示器刷新率同步（60fps 丝滑）；切换标签页时浏览器自动暂停 rAF 省电
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSnapshot, saveSnapshot, clearSnapshot } from '../services/storageService'
import type { SessionSnapshot } from '../types'

interface FocusTimer {
  /** 已过毫秒（每帧更新） */
  elapsedMs: number
  /** 是否暂停 */
  paused: boolean
  /** 是否已结束 */
  finished: boolean
  /** 暂停/继续 */
  togglePause: () => void
  /** 结束会话 */
  finish: () => void
  /** 恢复快照（返回快照数据，无快照返回 null） */
  restore: () => SessionSnapshot | null
  /** 开始新会话（清除旧快照） */
  begin: (plannedMs: number) => void
  /** 写入快照（调用方节流） */
  persist: (extra: Partial<SessionSnapshot>) => void
  /** 清除快照 */
  discard: () => void
  /** 实际经过的毫秒（含暂停前时间，结束瞬间取用） */
  getActualMs: () => number
}

export function useFocusTimer(): FocusTimer {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)

  // 锚点：开始时间戳 + 已暂停累计（用 ref 避免闭包过期）
  const anchorRef = useRef<{ startedAt: number; pausedMs: number } | null>(null)
  const pausedAtRef = useRef<number | null>(null)

  // rAF 帧同步循环：每帧计算精确 elapsed
  useEffect(() => {
    if (finished) return
    let rafId = 0
    const tick = () => {
      const anchor = anchorRef.current
      if (anchor && !paused) {
        setElapsedMs(Date.now() - anchor.startedAt - anchor.pausedMs)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [paused, finished])

  /** 暂停/继续 */
  const togglePause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev
      const anchor = anchorRef.current
      if (!anchor) return prev
      if (next) {
        // 暂停：记录暂停时刻
        pausedAtRef.current = Date.now()
      } else if (pausedAtRef.current) {
        // 继续：把暂停时长累计进 pausedMs
        anchor.pausedMs += Date.now() - pausedAtRef.current
        pausedAtRef.current = null
      }
      return next
    })
  }, [])

  /** 暂停状态的外部读取（供 toggle 后同步持久化） */
  const isPausedRef = useRef(false)
  useEffect(() => {
    isPausedRef.current = paused
  }, [paused])

  // 结束
  const finish = useCallback(() => {
    setFinished(true)
    clearSnapshot()
  }, [])

  /** 恢复快照：返回快照（用于恢复 UI 状态），无快照返回 null */
  const restore = useCallback((): SessionSnapshot | null => {
    const snapshot = getSnapshot()
    if (!snapshot) return null
    anchorRef.current = { startedAt: snapshot.startedAt, pausedMs: snapshot.pausedMs }
    setPaused(snapshot.paused)
    const el = Math.max(0, Date.now() - snapshot.startedAt - snapshot.pausedMs)
    setElapsedMs(el)
    return snapshot
  }, [])

  // 开始新会话
  const begin = useCallback((plannedMs: number) => {
    clearSnapshot()
    anchorRef.current = { startedAt: Date.now(), pausedMs: 0 }
    setElapsedMs(0)
    setPaused(false)
    setFinished(false)
    saveSnapshot({
      plannedMinutes: plannedMs / 60_000,
      startedAt: anchorRef.current.startedAt,
      pausedMs: 0,
      paused: false,
      weather: 'sunny',
      seedCount: 1,
      growthMinutes: 90,
      seedXs: [],
      plantedTrees: [],
    })
  }, [])

  // 写快照（合并额外字段）
  const persist = useCallback((extra: Partial<SessionSnapshot>) => {
    const anchor = anchorRef.current
    if (!anchor) return
    saveSnapshot({
      plannedMinutes: extra.plannedMinutes ?? 0,
      startedAt: anchor.startedAt,
      pausedMs: anchor.pausedMs,
      paused: extra.paused ?? paused,
      weather: extra.weather ?? 'sunny',
      seedCount: extra.seedCount ?? 1,
      growthMinutes: extra.growthMinutes ?? 90,
      seedXs: extra.seedXs ?? [],
      plantedTrees: extra.plantedTrees ?? [],
    })
  }, [paused])

  // 清除快照
  const discard = useCallback(() => {
    clearSnapshot()
  }, [])

  // 实际经过毫秒（结束瞬间取用，不受渲染延迟影响）
  const getActualMs = useCallback((): number => {
    const anchor = anchorRef.current
    if (!anchor) return 0
    return Date.now() - anchor.startedAt - anchor.pausedMs
  }, [])

  return { elapsedMs, paused, finished, togglePause, finish, restore, begin, persist, discard, getActualMs }
}
