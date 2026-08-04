// 季节服务：真实月份 → 季节，以及各季节的树冠/场景配色
import type { Season } from '../types'

/** 按真实月份计算季节（北半球） */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export const SEASON_NAMES: Record<Season, string> = {
  spring: '春天',
  summer: '夏天',
  autumn: '秋天',
  winter: '冬天',
}

/** 季节对树冠颜色的影响（覆盖/混合到树种色上） */
export interface SeasonPalette {
  /** 树叶主色调偏移（十六进制字符串替换，供 buildCrown 使用） */
  leafOverlay: 'spring' | 'summer' | 'autumn' | 'winter'
  /** 是否落叶（秋天叶子飘落粒子） */
  leafFall: boolean
  /** 是否花开（春天樱花等花树盛开） */
  bloom: boolean
  /** 是否枯枝（冬天无叶） */
  bare: boolean
}

/** 获取季节视觉属性 */
export function getSeasonPalette(season: Season): SeasonPalette {
  switch (season) {
    case 'spring':
      return { leafOverlay: 'spring', leafFall: false, bloom: true, bare: false }
    case 'summer':
      return { leafOverlay: 'summer', leafFall: false, bloom: false, bare: false }
    case 'autumn':
      return { leafOverlay: 'autumn', leafFall: true, bloom: false, bare: false }
    case 'winter':
      return { leafOverlay: 'winter', leafFall: false, bloom: false, bare: true }
  }
}

/** 季节 → 树冠色覆盖（在树种色基础上叠加季节感） */
export function seasonTint(season: Season, baseColor: string): string {
  // 简单色彩映射：根据季节对绿色系做偏移
  if (season === 'spring') return blend(baseColor, '#8fd07c', 0.35) // 新绿偏亮
  if (season === 'summer') return baseColor // 盛夏保持原色
  if (season === 'autumn') return blend(baseColor, '#d96c3f', 0.45) // 转红橙
  return blend(baseColor, '#8a9a8a', 0.5) // 冬天灰绿
}

/** 十六进制颜色混合 */
function blend(c1: string, c2: string, ratio: number): string {
  const parse = (c: string) => {
    const h = c.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const [r1, g1, b1] = parse(c1)
  const [r2, g2, b2] = parse(c2)
  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
