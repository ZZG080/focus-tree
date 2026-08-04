// 专注视图 V6：天气（含真实联动）+ 多种子 + 积雪消融 + 季节 + 枯树惩罚 + 场景
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FocusRecord, GrowthState, PlantedTree, Season, Weather } from '../types'
import {
  computeGrowth,
  effectiveGrowthMinutes,
  isTreeMature,
} from '../services/growthCurve'
import {
  addRecord,
  clearSnapshot,
  getRecords,
  getSettings,
  getSnapshot,
  persistUnlockedSpecies,
  saveSettings,
  saveSnapshot,
} from '../services/storageService'
import { generateEncouragement } from '../services/aiService'
import { computeUnlockedSpecies } from '../services/treeSpecies'
import { getCurrentSeason } from '../services/seasonService'
import { getScene } from '../services/sceneService'
import { TreeLayers, TreeRoots } from './TreeLayers'
import { Sky } from './Sky'
import { Ground } from './Ground'

interface FocusViewProps {
  initialMinutes: number
  onExit: () => void
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 生成一组种子的落点（避免重叠） */
function makeSeedPositions(count: number, avoidRange: Array<{ min: number; max: number }> = []): number[] {
  const positions: number[] = []
  const center = 500
  // 从中心向两侧分散，最小间距 90
  const spread = [0, -110, 110, -210, 210]
  for (let i = 0; i < count; i++) {
    let x = center + (spread[i] ?? (i % 2 === 0 ? -260 : 260))
    // 如果与其他种子或已有树重叠，微调
    let attempts = 0
    while (attempts < 8) {
      const clash = positions.some((p) => Math.abs(p - x) < 85)
      const clashOld = avoidRange.some((r) => x > r.min && x < r.max)
      if (!clash && !clashOld) break
      x += (Math.random() > 0.5 ? 1 : -1) * 40
      attempts++
    }
    positions.push(x)
  }
  return positions
}

export function FocusView({ initialMinutes, onExit }: FocusViewProps) {
  // 会话锚点
  const anchorRef = useRef<{ startedAt: number; pausedMs: number } | null>(null)
  const [plannedMs] = useState(() => initialMinutes * 60_000)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [paused, setPaused] = useState(false)

  // 设置：天气 + 种子数 + 生长周期 + 树种（会话开始时锁定）
  const [weather, setWeather] = useState<Weather>(() => getSettings().weather)
  const [seedCount, setSeedCount] = useState(() => Math.min(3, Math.max(1, getSettings().seedCount)))
  const [growthMinutes, setGrowthMinutes] = useState(() => getSettings().growthMinutes)
  const [speciesId] = useState(() => getSettings().speciesId)
  // 季节（auto 跟随真实月份）
  const [season] = useState<Season>(() => {
    const s = getSettings()
    return s.seasonMode === 'auto' ? getCurrentSeason() : s.seasonMode
  })
  // 场景（配色/粒子）
  const [sceneId] = useState(() => getSettings().sceneId)
  const scene = useMemo(() => getScene(sceneId), [sceneId])
  // 枯树惩罚：最近连续 N 次提前结束 → 本次的树枯萎
  const [wither] = useState(() => {
    const records = getRecords()
    // 连续 2 次提前结束触发（最近 3 条记录中）
    const recent = records.slice(0, 3)
    const recentFail = recent.filter((r) => !r.completed).length
    return recent.length >= 2 && recentFail >= 2
  })

  // 本次所有种子的落点（多种子同时落下、同步长大）
  const [seedXs, setSeedXs] = useState<number[]>([])
  // 历史已种树（用于遮挡 + 统计）
  const [plantedTrees, setPlantedTrees] = useState<PlantedTree[]>([])
  // 当前树的批次编号
  const batchRef = useRef(0)

  // 种子落地与镜头聚焦
  const [seedLanded, setSeedLanded] = useState(false)
  const [focusing, setFocusing] = useState(false)
  const [showIntro, setShowIntro] = useState(true)

  // 会话结束
  const [finished, setFinished] = useState(false)
  const [finishedRecord, setFinishedRecord] = useState<FocusRecord | null>(null)
  const [encouragement, setEncouragement] = useState('')

  const restoredRef = useRef(false)

  // 雨天加速：等效生长分钟（按当前生长周期折算比例）
  const effMinutes = effectiveGrowthMinutes(elapsedMs / 60_000, weather)
  const growth: GrowthState = useMemo(
    () => computeGrowth(effMinutes, growthMinutes),
    [effMinutes, growthMinutes]
  )
  const treeMatureNow = isTreeMature(effMinutes, growthMinutes)

  // 积雪程度：持久状态（雪天累积，切走后缓慢消融）
  const [snowLevel, setSnowLevel] = useState(0)
  const snowAccumRef = useRef(0)
  const lastTickRef = useRef(0)

  // 启动动画：种子落下 → 镜头聚焦 → 拉远
  useEffect(() => {
    const t1 = setTimeout(() => setSeedLanded(true), 900)
    const t2 = setTimeout(() => setFocusing(true), 950)
    const t3 = setTimeout(() => setFocusing(false), 1850)
    const t4 = setTimeout(() => setShowIntro(false), 2200)
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
    }
  }, [])

  // 恢复快照 / 初始化种子
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const snapshot = getSnapshot()
    if (snapshot) {
      anchorRef.current = { startedAt: snapshot.startedAt, pausedMs: snapshot.pausedMs }
      setPaused(snapshot.paused)
      setWeather(snapshot.weather ?? getSettings().weather)
      setSeedCount(snapshot.seedCount ?? 1)
      setGrowthMinutes(snapshot.growthMinutes ?? getSettings().growthMinutes)
      setPlantedTrees(snapshot.plantedTrees ?? [])
      setSeedXs(snapshot.seedXs?.length ? snapshot.seedXs : makeSeedPositions(snapshot.seedCount ?? 1))
      const el = Math.max(0, Date.now() - snapshot.startedAt - snapshot.pausedMs)
      setElapsedMs(el)
      if (el < plannedMs) {
        setSeedLanded(true)
        setShowIntro(false)
      }
    } else {
      const s = getSettings()
      setWeather(s.weather)
      setSeedCount(s.seedCount)
      setGrowthMinutes(s.growthMinutes)
      // 初始化种子落点（避开历史树位置——但新会话无历史树，直接生成）
      setSeedXs(makeSeedPositions(s.seedCount))
      anchorRef.current = { startedAt: Date.now(), pausedMs: 0 }
      saveSnapshot({
        plannedMinutes: initialMinutes,
        startedAt: anchorRef.current.startedAt,
        pausedMs: 0,
        paused: false,
        weather: s.weather,
        seedCount: s.seedCount,
        growthMinutes: s.growthMinutes,
        seedXs: makeSeedPositions(s.seedCount),
        plantedTrees: [],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 主计时循环
  useEffect(() => {
    if (paused || finished) return
    const timer = setInterval(() => {
      const anchor = anchorRef.current
      if (!anchor) return
      const now = Date.now()
      const el = now - anchor.startedAt - anchor.pausedMs
      setElapsedMs(el)

      // 积雪动态：雪天累积，其他天气缓慢消融（真实时间流逝）
      const deltaMs = lastTickRef.current ? now - lastTickRef.current : 500
      lastTickRef.current = now
      if (weather === 'snowy') {
        // 约 2/3 个生长周期积满（演示模式也快）
        const fullAccumMs = growthMinutes * 60_000 * (2 / 3)
        const target = Math.min(1, el / fullAccumMs)
        snowAccumRef.current = Math.min(1, snowAccumRef.current + (target - snowAccumRef.current) * 0.03 + deltaMs / fullAccumMs * 0.5)
        // 确保至少向 target 收敛
        if (snowAccumRef.current < target) snowAccumRef.current = target
      } else if (snowAccumRef.current > 0) {
        // 消融：约 1 个生长周期化完
        const meltMs = growthMinutes * 60_000
        snowAccumRef.current = Math.max(0, snowAccumRef.current - deltaMs / meltMs)
      }
      setSnowLevel(snowAccumRef.current)

      // 持久化快照（节流）
      if (el % 5000 < 500) {
        saveSnapshot({
          plannedMinutes: initialMinutes,
          startedAt: anchor.startedAt,
          pausedMs: anchor.pausedMs,
          paused,
          weather,
          seedCount,
          growthMinutes,
          seedXs,
          plantedTrees,
        })
      }
    }, 500)
    return () => clearInterval(timer)
  }, [paused, finished, initialMinutes, weather, seedCount, seedXs, plantedTrees, growthMinutes])

  // 大树长成 → 记录历史树 + 落新种子（保持用户选择的种子数）
  useEffect(() => {
    if (!treeMatureNow || finished) return
    // 把当前批次树加入历史（在中间位置，后续批次叠加）
    const batchTrees: PlantedTree[] = seedXs.map((x, i) => ({
      x,
      index: batchRef.current * seedCount + i,
      plantedAt: Date.now(),
    }))
    setPlantedTrees((prev) => {
      // 合并：新批次在后
      const merged = [...prev, ...batchTrees]
      // 最多保留最近 12 棵，避免场景过挤
      return merged.length > 12 ? merged.slice(-12) : merged
    })
    batchRef.current += 1
    // 新种子落下（同数量）
    const nextXs = makeSeedPositions(seedCount)
    setSeedXs(nextXs)
    setSeedLanded(false)
    setTimeout(() => setSeedLanded(true), 1200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeMatureNow, finished])

  // 会话结束
  const endSession = async (completed: boolean) => {
    if (finished) return
    const anchor = anchorRef.current
    const actualMs = anchor ? Date.now() - anchor.startedAt - anchor.pausedMs : elapsedMs
    setFinished(true)
    clearSnapshot()
    // 当前批次树也计入本次专注的树数
    const treesThisSession = batchRef.current * seedCount + seedXs.length
    const record: FocusRecord = {
      id: `focus-${Date.now()}`,
      plannedMinutes: plannedMs / 60_000,
      actualMinutes: Math.round((actualMs / 60_000) * 10) / 10,
      completed,
      startedAt: anchor?.startedAt ?? Date.now(),
      endedAt: Date.now(),
      weather,
      treeCount: treesThisSession,
    }
    addRecord(record)
    setFinishedRecord(record)
    // 解锁检测：基于最新记录计算并持久化（清记录不丢已解锁）
    const unlockedIds = computeUnlockedSpecies(getRecords())
    persistUnlockedSpecies(Array.from(unlockedIds))
    const msg = await generateEncouragement(record.actualMinutes, completed)
    setEncouragement(msg)
  }

  // 完成（倒计时自然结束）
  useEffect(() => {
    if (!finished && plannedMs > 0 && elapsedMs >= plannedMs) {
      endSession(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, plannedMs, finished])

  // 切换天气（立即生效，仅当前会话）
  const switchWeather = (w: Weather) => {
    setWeather(w)
    // 持久化为默认天气
    saveSettings({ weather: w })
  }

  // ---------- 渲染 ----------
  if (finished && finishedRecord) {
    return (
      <div className="result-view">
        <div className="result-card">
          <h2>{finishedRecord.completed ? '🎉 专注完成！' : '⏹ 已结束专注'}</h2>
          <p className="result-time">
            本次专注 <strong>{finishedRecord.actualMinutes}</strong> 分钟 · 种下{' '}
            <strong>{finishedRecord.treeCount ?? seedCount}</strong> 棵树
          </p>
          <p className="result-msg">{encouragement}</p>
          <div className="result-actions">
            <button className="start-btn" onClick={onExit}>🌱 返回，再看一棵</button>
          </div>
        </div>
      </div>
    )
  }

  const remainingMs = plannedMs - elapsedMs
  const showMatureToast = treeMatureNow && !finished

  return (
    <div className="focus-view">
      <div className="scene">
        <Sky weather={weather} scene={scene} />
        {/* 根系层（泥土之下）：所有树的根扎进土里 */}
        <svg className="tree-roots-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {plantedTrees.map((t, i) => {
            const backOrder = plantedTrees.length - 1 - i
            return (
              <TreeRoots
                key={`roots-old-${t.plantedAt}-${t.index}`}
                growth={growth}
                treeX={t.x}
                staticTree={true}
                layerOrder={backOrder}
              />
            )
          })}
          {seedXs.map((x, i) => (
            <TreeRoots
              key={`roots-cur-${x}-${i}`}
              growth={growth}
              treeX={x}
              layerOrder={0}
            />
          ))}
        </svg>
        <Ground snowLevel={snowLevel} isSnowy={weather === 'snowy'} scene={scene} />
        {/* 地上层（泥土之上）：种子/树干/树枝/树冠 */}
        <svg className="tree-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {/* 遮挡顺序：先种的树在最前（layerOrder 小），后种的在后（layerOrder 大→虚化） */}
          {plantedTrees.map((t, i) => {
            const backOrder = plantedTrees.length - 1 - i
            return (
              <TreeLayers
                key={`old-${t.plantedAt}-${t.index}`}
                growth={growth}
                seedLanded={true}
                focusing={false}
                treeX={t.x}
                staticTree={true}
                layerOrder={backOrder}
                speciesId={speciesId}
                season={season}
              />
            )
          })}
          {/* 当前批次（多种子同步生长；连续放弃时枯萎） */}
          {seedXs.map((x, i) => (
            <TreeLayers
              key={`cur-${x}-${i}`}
              growth={growth}
              seedLanded={seedLanded}
              focusing={focusing}
              treeX={x}
              layerOrder={0}
              speciesId={speciesId}
              season={season}
              wither={wither}
            />
          ))}
        </svg>
        {/* 枯树提示 */}
        {wither && !finished && (
          <div className="wither-toast">🌫️ 连续提前结束，这棵树枯萎了…完成一次专注让它恢复生机</div>
        )}
        {/* 顶部计时条 */}
        <div className="timer-bar">
          <div className="timer-text">{formatTime(remainingMs)}</div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, (elapsedMs / plannedMs) * 100)}%` }}
            />
          </div>
          <div className="timer-sub">
            第 {batchRef.current + 1} 批 · {formatTime(elapsedMs)} ·{' '}
            {weather === 'rainy' ? '🌧️ 雨水滋润生长' : weather === 'snowy' ? '❄️ 雪花飘落' : '☀️ 阳光正好'}
          </div>
        </div>
        {/* 天气切换 */}
        <div className="weather-switcher">
          {(['sunny', 'rainy', 'snowy'] as Weather[]).map((w) => (
            <button
              key={w}
              className={`weather-btn ${weather === w ? 'active' : ''}`}
              onClick={() => switchWeather(w)}
              title={w === 'sunny' ? '晴天' : w === 'rainy' ? '雨天（生长加速）' : '雪天（积雪）'}
            >
              {w === 'sunny' ? '☀️' : w === 'rainy' ? '🌧️' : '❄️'}
            </button>
          ))}
        </div>
        {/* 控制按钮 */}
        <div className="controls">
          {!paused ? (
            <button className="ghost-btn" onClick={() => setPaused(true)}>⏸ 暂停</button>
          ) : (
            <button className="ghost-btn" onClick={() => setPaused(false)}>▶ 继续</button>
          )}
          <button className="ghost-btn danger" onClick={() => endSession(false)}>⏹ 结束</button>
        </div>
      </div>

      {focusing && <div className="focus-flash" />}
      {showIntro && !seedLanded && (
        <div className="intro-overlay">
          <p>{seedCount > 1 ? `${seedCount} 粒种子正从天而降…` : '一粒种子正从天而降…'}</p>
        </div>
      )}
      {showMatureToast && (
        <div className="mature-toast">🌳 大树长成！新种子即将落下…</div>
      )}
    </div>
  )
}
