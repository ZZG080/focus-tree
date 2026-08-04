import { describe, it, expect } from 'vitest'
import {
  computeGrowth,
  isTreeMature,
  cycleElapsedMinutes,
  FULL_GROWTH_MINUTES,
  effectiveGrowthMinutes,
  fullGrowthRealMinutes,
  WEATHER_GROWTH_RATE,
} from '../src/services/growthCurve'

describe('growthCurve 生长曲线（90min 默认周期）', () => {
  it('0 分钟时处于种子阶段', () => {
    const g = computeGrowth(0)
    expect(g.stage).toBe('seed')
    expect(g.phaseProgress).toBe(0)
  })

  it('7.5 分钟时根系生长一半（root 阶段 0.5 进度）', () => {
    const g = computeGrowth(7.5)
    expect(g.stage).toBe('root')
    expect(g.phaseProgress).toBeCloseTo(0.5, 5)
  })

  it('15 分钟时进入 sprout 阶段（萌芽）', () => {
    const g = computeGrowth(15)
    expect(g.stage).toBe('sprout')
    expect(g.phaseProgress).toBeCloseTo(0, 5)
  })

  it('25 分钟时破土舒展（sprout 结束）', () => {
    const g = computeGrowth(25)
    expect(g.stage).toBe('tree')
    expect(g.phaseProgress).toBeCloseTo(0, 5)
  })

  it('90 分钟时大树长成（总进度 1）', () => {
    const g = computeGrowth(90)
    expect(g.stage).toBe('tree')
    expect(g.phaseProgress).toBe(1)
    expect(g.totalProgress).toBe(1)
  })

  it('120 分钟（超过一个周期）折算回 30 分钟的状态', () => {
    const g = computeGrowth(120)
    const g30 = computeGrowth(30)
    expect(g.stage).toBe(g30.stage)
    expect(g.phaseProgress).toBeCloseTo(g30.phaseProgress, 5)
  })

  it('isTreeMature 在 90 分钟为 true', () => {
    expect(isTreeMature(89, 90)).toBe(false)
    expect(isTreeMature(90, 90)).toBe(true)
    expect(isTreeMature(95, 90)).toBe(true)
  })

  it('cycleElapsedMinutes 正确折算周期内分钟', () => {
    expect(cycleElapsedMinutes(30, 90)).toBe(30)
    expect(cycleElapsedMinutes(100, 90)).toBe(10)
    expect(cycleElapsedMinutes(181, 90)).toBe(1)
    expect(FULL_GROWTH_MINUTES).toBe(90)
  })
})

describe('growthCurve 生长曲线（自定义周期）', () => {
  it('5 分钟周期：对应 7.5/90 比例处根系一半', () => {
    // 5 分钟周期中，7.5 分钟对应 90 分钟周期的 7.5/90 比例
    const g = computeGrowth(5 * (7.5 / 90), 5)
    expect(g.stage).toBe('root')
    expect(g.phaseProgress).toBeCloseTo(0.5, 5)
  })

  it('5 分钟周期：约 1.39 分钟时开始萌芽（15/90 比例）', () => {
    const g = computeGrowth(5 * (15 / 90), 5)
    expect(g.stage).toBe('sprout')
  })

  it('5 分钟周期：5 分钟时长成', () => {
    const g = computeGrowth(5, 5)
    expect(g.stage).toBe('tree')
    expect(g.totalProgress).toBe(1)
    expect(isTreeMature(5, 5)).toBe(true)
  })

  it('15 分钟周期：整周期边界视为长满', () => {
    const g = computeGrowth(15, 15)
    expect(g.stage).toBe('tree')
    expect(g.totalProgress).toBe(1)
  })

  it('90 分钟周期的阶段比例在任意周期下保持一致', () => {
    // 根系阶段占 0~15/90 比例
    const gShort = computeGrowth(5 * (7.5 / 90), 5)
    const gLong = computeGrowth(7.5, 90)
    expect(gShort.phaseProgress).toBeCloseTo(gLong.phaseProgress, 5)
    expect(gShort.stage).toBe(gLong.stage)
  })
})

describe('growthCurve 天气加速', () => {
  it('雨天等效生长分钟为实际 ×1.15', () => {
    expect(effectiveGrowthMinutes(10, 'rainy')).toBeCloseTo(11.5, 5)
    expect(effectiveGrowthMinutes(10, 'sunny')).toBe(10)
    expect(effectiveGrowthMinutes(10, 'snowy')).toBe(10)
  })

  it('雨天一棵树长满更快', () => {
    const sunnyFull = fullGrowthRealMinutes(90, 'sunny')
    const rainyFull = fullGrowthRealMinutes(90, 'rainy')
    expect(rainyFull).toBeCloseTo(90 / 1.15, 5)
    // 雨天实际所需时间更短
    expect(rainyFull).toBeLessThan(sunnyFull)
    // 雨天经过 rainyFull 实际时间后，等效时间已达 90（容忍浮点误差）
    const eff = effectiveGrowthMinutes(rainyFull, 'rainy')
    expect(eff).toBeGreaterThanOrEqual(90 - 1e-9)
    expect(isTreeMature(eff, 90)).toBe(true)
  })

  it('天气倍率映射完整', () => {
    expect(WEATHER_GROWTH_RATE.sunny).toBe(1)
    expect(WEATHER_GROWTH_RATE.rainy).toBeGreaterThan(1)
    expect(WEATHER_GROWTH_RATE.snowy).toBe(1)
  })
})
