// 生长计算 Web Worker：把 computeGrowth 移出主线程，主线程只负责渲染
// 协议：{ type: 'compute', elapsedMinutes, fullMinutes } → { type: 'result', id, growth }
// 与主线程 growthCurve.ts 共用同一套 STAGE_RATIOS（此处独立实现，保持纯函数无依赖）
import type { GrowthState, GrowthStage } from '../types'

const STAGE_RATIOS: Array<{ at: number; until: number; stage: GrowthStage }> = [
  { at: 0, stage: 'root', until: 15 / 90 },
  { at: 15 / 90, stage: 'sprout', until: 25 / 90 },
  { at: 25 / 90, stage: 'tree', until: 1 },
]

function computeGrowth(elapsedMinutes: number, fullMinutes: number): GrowthState {
  if (fullMinutes <= 0) fullMinutes = 90
  const raw = Math.max(0, (elapsedMinutes % fullMinutes) / fullMinutes)
  const t = raw === 0 && elapsedMinutes > 0 ? 1 : raw

  if (t === 0) {
    return { stage: 'seed', phaseProgress: 0, totalProgress: 0 }
  }

  let stage: GrowthStage = 'root'
  let phaseProgress = 0

  for (const point of STAGE_RATIOS) {
    if (t >= point.at) {
      stage = point.stage
      phaseProgress = Math.min(1, (t - point.at) / (point.until - point.at))
    }
  }

  return { stage, phaseProgress, totalProgress: Math.min(1, t) }
}

self.onmessage = (e: MessageEvent<{ type: 'compute'; id: number; elapsedMinutes: number; fullMinutes: number }>) => {
  const { type, id, elapsedMinutes, fullMinutes } = e.data
  if (type !== 'compute') return
  const growth = computeGrowth(elapsedMinutes, fullMinutes)
  ;(self as unknown as Worker).postMessage({ type: 'result', id, growth })
}

export {}
