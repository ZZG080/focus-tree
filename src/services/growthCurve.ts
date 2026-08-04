// 生长曲线：把经过时间映射为生长阶段与进度（支持可配置生长周期）
import type { GrowthState, GrowthStage, Weather } from '../types'

/** 默认一棵树完全长成所需时间（分钟）—— 真实模式 */
export const FULL_GROWTH_MINUTES = 90

/** 可选的生长周期预设（分钟），供用户选择 */
export const GROWTH_PRESETS = [90, 25, 15, 5] as const

/**
 * 生长阶段比例（相对一个完整周期 0~1）
 * 规则来自需求文档（以 90min 为基准）：
 *  0             ：种子落地（单独处理）
 *  0 ~ 15/90     ：根系生长至泥土一半
 *  15/90 ~ 25/90 ：萌发，破土舒展枝叶
 *  25/90 ~ 1     ：树干长粗长高至天空 1/2
 */
const STAGE_RATIOS: Array<{ at: number; until: number; stage: GrowthStage }> = [
  { at: 0, stage: 'root', until: 15 / 90 },
  { at: 15 / 90, stage: 'sprout', until: 25 / 90 },
  { at: 25 / 90, stage: 'tree', until: 1 },
]

/**
 * 天气对生长速度的影响系数（倍率）
 * 雨天加快约 15%（不要快太多）
 */
export const WEATHER_GROWTH_RATE: Record<Weather, number> = {
  sunny: 1,
  rainy: 1.15,
  snowy: 1,
}

/** 浮点容差：避免 90/1.15*1.15=89.999... 这类精度问题 */
const MATURE_EPSILON = 1e-6

/** 是否大树长成（该周期已满，可落新种子） */
export function isTreeMature(effectiveMinutes: number, fullMinutes: number): boolean {
  return effectiveMinutes >= fullMinutes - MATURE_EPSILON
}

/**
 * 按天气折算等效生长分钟数（雨天 1.15x 加速）
 */
export function effectiveGrowthMinutes(elapsedMinutes: number, weather: Weather): number {
  return elapsedMinutes * WEATHER_GROWTH_RATE[weather]
}

/** 当前天气下，一棵树长满所需的实际分钟数 */
export function fullGrowthRealMinutes(fullMinutes: number, weather: Weather): number {
  return fullMinutes / WEATHER_GROWTH_RATE[weather]
}

/**
 * 计算给定已过分钟数的生长状态（基于比例，支持任意周期长度）。
 * 若超过一个完整周期，按周期折算；整周期边界视为"刚好长满"。
 */
export function computeGrowth(elapsedMinutes: number, fullMinutes: number = FULL_GROWTH_MINUTES): GrowthState {
  if (fullMinutes <= 0) fullMinutes = FULL_GROWTH_MINUTES

  // 折算到单个周期内；整周期边界返回满进度（t=1）
  const raw = Math.max(0, (elapsedMinutes % fullMinutes) / fullMinutes)
  const t = raw === 0 && elapsedMinutes > 0 ? 1 : raw

  // 种子落地瞬间（t=0）单独处理，随后立即进入根系阶段
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

/** 当前周期已过分钟数（供 UI 显示用） */
export function cycleElapsedMinutes(elapsedMinutes: number, fullMinutes: number = FULL_GROWTH_MINUTES): number {
  return Math.max(0, elapsedMinutes % fullMinutes)
}
