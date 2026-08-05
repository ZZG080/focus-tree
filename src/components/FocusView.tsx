// 专注视图 V8：rAF 帧同步驱动 + 快照恢复 + 积雪消融 + 季节 + 枯树 + 场景
// V8 新增：挑战模式（暴风雨+双倍奖励）/ 落叶风力物理 / 连携效应 / 树长大系统通知 / Web Worker 生长计算
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FocusRecord, GrowthState, PlantedTree, Season, Weather } from '../types'
import {
  computeGrowth,
  effectiveGrowthMinutes,
  isTreeMature,
} from '../services/growthCurve'
import {
  addRecord,
  getRecords,
  getSettings,
  getWitherPool,
  persistUnlockedSpecies,
  setWitherPool,
  saveSettings,
} from '../services/storageService'
import { generateEncouragement } from '../services/aiService'
import { computeUnlockedSpecies, getSpecies } from '../services/treeSpecies'
import { getCurrentSeason } from '../services/seasonService'
import { getScene } from '../services/sceneService'
import { useFocusTimer } from '../hooks/useFocusTimer'
import { TreeLayers, TreeRoots } from './TreeLayers'
import { Sky } from './Sky'
import { Ground } from './Ground'

interface FocusViewProps {
  initialMinutes: number
  onExit: () => void
}

/** 树长大系统通知（PWA；需用户授权，失败静默） */
function notifyTreeGrown(speciesName: string, batch: number): void {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    new Notification('🌳 大树长成！', {
      body: `第 ${batch} 棵${speciesName}长成啦！新种子即将落下，继续保持专注～`,
      tag: `focus-tree-grown-${batch}`,
    })
  } catch {
    /* 通知失败静默 */
  }
}

/** 请求通知权限（在用户手势后调用） */
function requestNotifyPermission(): void {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

/** 树种显示名（通知文案用） */
function speciesName(id: string): string {
  try {
    return getSpecies(id).name
  } catch {
    return '树'
  }
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
  const plannedMs = initialMinutes * 60_000
  const timer = useFocusTimer()
  const { elapsedMs, paused, finished } = timer

  // 设置：天气 + 种子数 + 生长周期 + 树种（会话开始时锁定）
  const [challengeMode] = useState(() => getSettings().challengeMode)
  const [weather, setWeather] = useState<Weather>(() => (getSettings().challengeMode ? 'storm' : getSettings().weather))
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
  // 手绘滤镜：桌面端启用（feTurbulence 耗 GPU，移动端关闭保性能）
  const [handDrawn] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1080px)').matches)
  // 枯树池（游戏化机制）：提前结束种下枯树，后续完成专注 1:1 复苏替代，复苏完才正常新增
  const [witherPool, setWitherPoolState] = useState(() => getWitherPool())
  // 本次会话复苏信息（结果页展示）
  const [reviveInfo, setReviveInfo] = useState<{ revived: number; remaining: number; isNew: boolean } | null>(null)

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
  const [finishedRecord, setFinishedRecord] = useState<FocusRecord | null>(null)
  const [encouragement, setEncouragement] = useState('')

  const restoredRef = useRef(false)

  // 雨天加速：等效生长分钟（按当前生长周期折算比例）
  const effMinutes = effectiveGrowthMinutes(elapsedMs / 60_000, weather)

  // 生长计算：同步 useMemo（computeGrowth 为 O(1) 纯函数，微秒级；
  // 曾尝试 Web Worker 异步化，但 dev 模式下 worker 消息链路不稳定会导致
  // growth 卡死在初始值（树不生长）——恢复同步计算，稳定可靠）
  const growth: GrowthState = useMemo(
    () => computeGrowth(effMinutes, growthMinutes),
    [effMinutes, growthMinutes]
  )
  const treeMatureNow = isTreeMature(effMinutes, growthMinutes)

  // 风力物理：阵风缓变（正弦 + 随机阵风），驱动落叶/雨幕水平偏移
  const [windStrength, setWindStrength] = useState(0)
  useEffect(() => {
    let rafId = 0
    const t0 = Date.now()
    const loop = () => {
      const t = (Date.now() - t0) / 1000
      // 主风 8s 周期正弦 + 阵风（每 11s 一个脉冲）
      const gust = Math.sin(t / 11 * Math.PI * 2) * Math.sin(t * 1.7) * 0.35
      setWindStrength(Math.max(-1, Math.min(1, Math.sin(t / 4) * 0.55 + gust)))
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // 积雪程度：持久状态（雪天累积，切走后缓慢消融）
  const [snowLevel, setSnowLevel] = useState(0)
  const snowAccumRef = useRef(0)
  const lastTickRef = useRef(0)
  const lastSaveRef = useRef(0)

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
    const settings = getSettings()
    const snapshot = timer.restore()
    if (snapshot) {
      setWeather(snapshot.challengeMode ? 'storm' : (snapshot.weather ?? settings.weather))
      setSeedCount(snapshot.seedCount ?? 1)
      setGrowthMinutes(snapshot.growthMinutes ?? settings.growthMinutes)
      setPlantedTrees(snapshot.plantedTrees ?? [])
      setSeedXs(snapshot.seedXs?.length ? snapshot.seedXs : makeSeedPositions(snapshot.seedCount ?? 1))
      setSeedLanded(true)
      setShowIntro(false)
      return
    }
    // 新会话（挑战模式：强制暴风雨天气）
    setWeather(settings.challengeMode ? 'storm' : settings.weather)
    setSeedCount(settings.seedCount)
    setGrowthMinutes(settings.growthMinutes)
    const xs = makeSeedPositions(settings.seedCount)
    setSeedXs(xs)
    timer.begin(plannedMs)
    // 请求系统通知权限（用户点击开始后的手势上下文）
    requestNotifyPermission()
    // 立即保存完整快照（覆盖 begin 的占位）
    timer.persist({
      plannedMinutes: plannedMs / 60_000,
      weather: settings.challengeMode ? 'storm' : settings.weather,
      seedCount: settings.seedCount,
      growthMinutes: settings.growthMinutes,
      seedXs: xs,
      plantedTrees: [],
      challengeMode: settings.challengeMode,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 帧同步循环副作用：积雪动态 + 快照节流（依赖 elapsedMs 每帧变化触发）
  useEffect(() => {
    if (finished) return
    const now = Date.now()
    // 积雪动态：雪天累积，其他天气缓慢消融（真实时间流逝）
    const deltaMs = lastTickRef.current ? now - lastTickRef.current : 500
    lastTickRef.current = now
    if (weather === 'snowy') {
      // 约 2/3 个生长周期积满（演示模式也快）
      const fullAccumMs = growthMinutes * 60_000 * (2 / 3)
      const target = Math.min(1, elapsedMs / fullAccumMs)
      snowAccumRef.current = Math.min(1, snowAccumRef.current + (target - snowAccumRef.current) * 0.03 + (deltaMs / fullAccumMs) * 0.5)
      if (snowAccumRef.current < target) snowAccumRef.current = target
    } else if (snowAccumRef.current > 0) {
      // 消融：约 1 个生长周期化完
      const meltMs = growthMinutes * 60_000
      snowAccumRef.current = Math.max(0, snowAccumRef.current - deltaMs / meltMs)
    }
    setSnowLevel(snowAccumRef.current)

    // 持久化快照（节流：每 5s 一次）
    if (now - lastSaveRef.current > 5000) {
      lastSaveRef.current = now
      timer.persist({
        plannedMinutes: plannedMs / 60_000,
        weather,
        seedCount,
        growthMinutes,
        seedXs,
        plantedTrees,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, finished])

  // 大树长成 → 记录历史树（含出生天气遗产 + 稀有变异） + 落新种子 + 系统通知 + 连携效应
  useEffect(() => {
    if (!treeMatureNow || finished) return
    // 把当前批次树加入历史（记录出生天气：雨天树带露珠、雪天树带积雪；记录树种供连携判定）
    const batchTrees: PlantedTree[] = seedXs.map((x, i) => ({
      x,
      index: batchRef.current * seedCount + i,
      plantedAt: Date.now(),
      birthWeather: weather,
      speciesId,
      // 1% 概率变异为金色树（稀有收藏）
      variant: Math.random() < 0.01 ? 'golden' : undefined,
    }))
    // 系统通知：树长成（PWA 通知 API）
    notifyTreeGrown(speciesName(speciesId), batchRef.current + 1)
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

  // 连携效应：连续 3 棵同种树 → 树旁长蘑菇/小花丛（小树林氛围）
  const companions = useMemo(() => {
    if (plantedTrees.length < 3) return []
    const last3 = plantedTrees.slice(-3)
    const allSame = last3.every((t) => t.speciesId === last3[0].speciesId && t.speciesId)
    if (!allSame) return []
    const out: Array<{ x: number; type: 'mushroom' | 'flower' }> = []
    last3.forEach((t, i) => {
      // 每棵树旁 1~2 个点缀，交替蘑菇/小花
      out.push({ x: t.x + (i % 2 === 0 ? -34 : 30), type: i % 2 === 0 ? 'mushroom' : 'flower' })
      if (i === 1) out.push({ x: t.x - 6, type: 'flower' })
    })
    return out
  }, [plantedTrees])

  // 会话结束（枯树机制：提前结束 → 本批树枯萎入池；完成 → 复苏替代旧枯树，复苏完才正常新增）
  const endSession = async (completed: boolean) => {
    if (finished) return
    const actualMs = timer.getActualMs()
    timer.finish()
    const batchTreesThisSession = batchRef.current * seedCount + seedXs.length
    // 挑战模式奖励：完整完成时双倍树数（暴风雨的回报）
    const challengeBonus = challengeMode && completed
    let treesThisSession = batchTreesThisSession
    if (challengeBonus) treesThisSession *= 2
    // ===== 枯树池结算 =====
    let revived = 0
    let remaining = getWitherPool()
    if (!completed) {
      // 提前结束：本批所有树枯萎 → 场景中本批变枯树 + 入池
      const batchStart = batchRef.current * seedCount
      setPlantedTrees((prev) =>
        prev.map((t) => (t.index >= batchStart ? { ...t, wither: true } : t))
      )
      remaining = remaining + seedXs.length
      setWitherPool(remaining)
    } else {
      // 完成：本批树 1:1 复苏替代池中枯树（复苏完才正常新增）
      revived = Math.min(treesThisSession, remaining)
      remaining = remaining - revived
      setWitherPool(remaining)
    }
    setWitherPoolState(remaining)
    setReviveInfo({ revived, remaining, isNew: completed })
    const record: FocusRecord = {
      id: `focus-${Date.now()}`,
      plannedMinutes: plannedMs / 60_000,
      actualMinutes: Math.round((actualMs / 60_000) * 10) / 10,
      completed,
      startedAt: Date.now() - actualMs,
      endedAt: Date.now(),
      weather,
      treeCount: treesThisSession,
      speciesId,
      challengeBonus,
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

  // 切换天气（立即生效，仅当前会话；挑战模式天气锁定暴风雨，不可切换）
  const switchWeather = (w: Weather) => {
    if (challengeMode) return
    setWeather(w)
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
            {finishedRecord.challengeBonus && <span className="bonus-badge">⚡ 挑战双倍奖励</span>}
          </p>
          <p className="result-msg" role="status" aria-live="polite">{encouragement}</p>
          {reviveInfo && !reviveInfo.isNew && reviveInfo.remaining > 0 && (
            <p className="wither-result">🌫️ 种下了 {seedXs.length} 棵枯树，还有 {reviveInfo.remaining} 棵待复苏</p>
          )}
          {reviveInfo && reviveInfo.isNew && reviveInfo.revived > 0 && (
            <p className="wither-result">
              {reviveInfo.remaining > 0
                ? `⚡ 复苏了 ${reviveInfo.revived} 棵枯树，还有 ${reviveInfo.remaining} 棵待复苏`
                : `🎉 复苏了 ${reviveInfo.revived} 棵枯树，森林重获新生！`}
            </p>
          )}
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
        {/* 太阳位置 = 专注进度（0 开始 → 1 结束，东升西落）；风力驱动落叶/雨幕 */}
        <Sky weather={weather} scene={scene} mature={treeMatureNow} sunProgress={Math.min(1, elapsedMs / plannedMs)} windStrength={windStrength} />
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
        <Ground snowLevel={snowLevel} isSnowy={weather === 'snowy'} isRainy={weather === 'rainy'} isStorm={weather === 'storm'} scene={scene} mature={treeMatureNow} companions={companions} />
        {/* 地上层（泥土之上）：种子/树干/树枝/树冠 */}
        <svg className="tree-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {/* 手绘噪点滤镜：给树形添加铅笔质感（feTurbulence 轻扭曲） */}
          <defs>
            <filter id="roughness" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04 0.06" numOctaves="2" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
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
                birthWeather={t.birthWeather}
                variant={t.variant}
                handDrawn={handDrawn}
                shadowDir={Math.round(Math.min(1, elapsedMs / plannedMs) * 10) / 10}
              />
            )
          })}
          {/* 当前批次（多种子同步生长；连续放弃时枯萎；暂停时柔光+震颤） */}
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
              paused={paused}
            />
          ))}
        </svg>
        {/* 枯树池提示（游戏化机制：提前结束种枯树，完成专注复苏） */}
        {witherPool > 0 && !finished && (
          <div className="wither-toast" role="status" aria-live="polite">
            🌫️ 有 {witherPool} 棵枯树待复苏——完成一次专注，种下的树将先复苏它们
          </div>
        )}
        {/* 顶部计时条 */}
        <div className="timer-bar">
          <time className="timer-text" dateTime={`PT${Math.max(0, Math.floor(remainingMs / 1000))}S`}>
            {formatTime(remainingMs)}
          </time>
          <div className="progress-track" role="progressbar" aria-valuenow={Math.round((elapsedMs / plannedMs) * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, (elapsedMs / plannedMs) * 100)}%` }}
            />
          </div>
          <div className="timer-sub" aria-live="polite">
            第 {batchRef.current + 1} 批 · {formatTime(elapsedMs)} ·{' '}
            {weather === 'rainy' ? '🌧️ 雨水滋润生长' : weather === 'snowy' ? '❄️ 雪花飘落' : weather === 'storm' ? '⛈️ 暴风雨中，成长艰难…' : '☀️ 阳光正好'}
          </div>
        </div>
        {/* 天气切换（挑战模式锁定暴风雨，不显示） */}
        {!challengeMode && (
          <div className="weather-switcher" role="group" aria-label="切换天气">
            {(['sunny', 'rainy', 'snowy'] as Weather[]).map((w) => (
              <button
                key={w}
                className={`weather-btn ${weather === w ? 'active' : ''}`}
                onClick={() => switchWeather(w)}
                aria-label={w === 'sunny' ? '切换到晴天' : w === 'rainy' ? '切换到雨天' : '切换到雪天'}
                title={w === 'sunny' ? '晴天' : w === 'rainy' ? '雨天（生长加速）' : '雪天（积雪）'}
              >
                {w === 'sunny' ? '☀️' : w === 'rainy' ? '🌧️' : '❄️'}
              </button>
            ))}
          </div>
        )}
        {/* 挑战模式提示条 */}
        {challengeMode && !finished && (
          <div className="challenge-toast" role="status" aria-live="polite">⛈️ 暴风雨挑战：生长减缓 40%，完整完成获得双倍树奖励</div>
        )}
        {/* 控制按钮 */}
        <div className="controls">
          {!paused ? (
            <button className="ghost-btn" onClick={timer.togglePause} aria-label="暂停专注">⏸ 暂停</button>
          ) : (
            <button className="ghost-btn" onClick={timer.togglePause} aria-label="继续专注">▶ 继续</button>
          )}
          <button className="ghost-btn danger" onClick={() => endSession(false)} aria-label="结束专注">⏹ 结束</button>
        </div>
      </div>

      {focusing && <div className="focus-flash" />}
      {showIntro && !seedLanded && (
        <div className="intro-overlay" role="status" aria-live="polite">
          <p>{seedCount > 1 ? `${seedCount} 粒种子正从天而降…` : '一粒种子正从天而降…'}</p>
        </div>
      )}
      {showMatureToast && (
        <div className="mature-toast" role="status" aria-live="polite">🌳 大树长成！新种子即将落下…</div>
      )}
    </div>
  )
}
