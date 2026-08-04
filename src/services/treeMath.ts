// 树形数学纯函数：不依赖 React，只接收数字参数返回 SVG 路径数据
// 独立于组件层，便于单元测试和未来迁移 Canvas/WebGL
import type { GrowthState, Season, Weather } from '../types'
import type { TreeSpecies } from './treeSpecies'
import { seasonTint } from './seasonService'

/** 地平线 Y 坐标（天空:地面 = 5:1，草地顶部） */
export const GROUND_Y = 580
/** 草地区域：580-620（上 1/3） */
export const GRASS_END = 620
/** 种子入土位置（棕色泥土区域，约泥土 1/3 深处） */
export const SEED_Y = 632
/** 树干底部：深入泥土，与根系起点重叠（保证根茎连续） */
export const TRUNK_BASE = SEED_Y + 10

export function clamp(v: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, v))
}

/** 缓动：让生长更自然 */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** 缓动：先快后慢再停（用于根系舒展） */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * 树形参数（统一 totalProgress 驱动，连续无跳变）：
 *  - 0~0.17  ：种子入土 + 根系向四周舒展
 *  - 0.17~0.28：破土出茎，萌芽
 *  - 0.28~1  ：主干长高长粗 + 树枝分叉 + 树冠膨胀
 */
export function computeTreeParams(growth: GrowthState) {
  const t = clamp(growth.totalProgress)

  // 根系：0.28 前完成主体舒展，之后轻微延伸（加长，更明显）
  let rootT = 0
  if (t > 0.03) rootT = easeInOut(clamp((t - 0.03) / 0.25))
  const rootLen = rootT * 110 // 舒展半径加大到 110px

  // 主干：0.15 破土，0.17~0.28 快速伸出，之后长高到 280
  let trunkH = 0
  let trunkW = 0
  if (t > 0.15) {
    const stemT = easeOut(clamp((t - 0.15) / 0.13))
    const growT = easeOut(clamp((t - 0.28) / 0.72))
    trunkH = stemT * 70 + growT * 215
    trunkW = 5 + stemT * 4 + growT * 13
  }

  // 树枝分叉：大树阶段出现（t>0.45）
  const branchT = t > 0.45 ? easeOut(clamp((t - 0.45) / 0.55)) : 0

  // 树冠：t>0.22 出现，持续膨胀
  let crownR = 0
  let leafCount = 0
  if (t > 0.22) {
    const crownT = easeOut(clamp((t - 0.22) / 0.78))
    crownR = 9 + crownT * 108 // 9 → 117
    leafCount = 3 + Math.round(crownT * 7) // 3 → 10 团
  }

  // 果实点缀：大树阶段
  const fruitT = t > 0.55 ? clamp((t - 0.55) / 0.45) : 0

  const trunkTopY = SEED_Y - trunkH
  const crownY = trunkTopY - crownR * 0.4

  return { rootLen, rootT, trunkH, trunkW, trunkTopY, crownY, crownR, leafCount, branchT, fruitT }
}

export type TreeParams = ReturnType<typeof computeTreeParams>

/** 多级根系：从树干底部两侧自然延伸，颜色提亮确保在泥土中可见 */
export function buildRoots(cx: number, baseY: number, len: number, t: number, trunkW: number): string {
  if (len <= 2) return ''
  const parts: string[] = []
  const anchorW = Math.max(trunkW * 0.6, 10)
  // 主根：7 条向两侧+下方舒展（角度更广，更舒展）
  const mainRoots = [
    { angle: -72, spread: 1.0, len: 1.0, side: -1 },
    { angle: -48, spread: 0.85, len: 0.95, side: -1 },
    { angle: -24, spread: 0.65, len: 0.85, side: -1 },
    { angle: 5, spread: 0.45, len: 0.75, side: 1 },
    { angle: 28, spread: 0.7, len: 0.88, side: 1 },
    { angle: 52, spread: 0.9, len: 0.96, side: 1 },
    { angle: 74, spread: 1.0, len: 1.0, side: 1 },
  ]
  for (const r of mainRoots) {
    const rad = (r.angle * Math.PI) / 180
    const startX = cx + r.side * anchorW * 0.55
    const startY = baseY
    const endX = cx + Math.sin(rad) * len * r.spread + r.side * anchorW * 0.15
    const endY = startY + Math.cos(rad) * len * r.len
    const ctrlX = startX + Math.sin(rad) * len * r.spread * 0.5 + Math.cos(rad) * 6
    const ctrlY = startY + Math.cos(rad) * len * r.len * 0.45 + 3
    // 提亮颜色：深棕 #5d3a1e（比泥土深很多，清晰可见）
    parts.push(
      `<path d="M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}" fill="none" stroke="#5d3a1e" stroke-width="3.5" stroke-linecap="round" pathLength="100" class="tree-grow-stroke" opacity="0.9" />`
    )
    // 侧根须：中段分叉
    if (t > 0.4 && r.spread > 0.6) {
      const sideX = startX + Math.sin(rad) * len * r.spread * 0.45
      const sideY = startY + Math.cos(rad) * len * r.len * 0.35
      const sEndX = sideX + Math.sin(rad + 0.6) * 20
      const sEndY = sideY + Math.cos(rad + 0.6) * 16 + 6
      parts.push(
        `<path d="M ${sideX} ${sideY} Q ${sideX + 5} ${sideY + 8} ${sEndX} ${sEndY}" fill="none" stroke="#7a4f2a" stroke-width="2.2" stroke-linecap="round" pathLength="100" class="tree-grow-stroke" opacity="0.8" />`
      )
    }
  }
  // 细须根：7 条更细，向四周扩散
  for (let i = 0; i < 7; i++) {
    const angle = -70 + i * 22 + (i % 2) * 8
    const rad = (angle * Math.PI) / 180
    const side = angle < 0 ? -1 : 1
    const startX = cx + side * anchorW * 0.3
    const startY = baseY + 2
    const endX = startX + Math.sin(rad) * len * 0.55
    const endY = startY + Math.cos(rad) * len * 0.5 + 2
    parts.push(
      `<path d="M ${startX} ${startY} Q ${startX + Math.sin(rad) * 10} ${startY + len * 0.25} ${endX} ${endY}" fill="none" stroke="#9a6a3a" stroke-width="1.8" stroke-linecap="round" pathLength="100" class="tree-grow-stroke" opacity="0.65" />`
    )
  }
  return parts.join('')
}

/** 树干：带树皮纹理与轻微弯曲，基部堆土丘 + 露土根爬出（"种在土里"的视觉）
 * 返回 SVG 片段数组
 */
export function buildTrunk(cx: number, bottomY: number, topY: number, w: number, trunkColor: string): string[] {
  if (w <= 2) return []
  const h = bottomY - topY
  const bend = w * 0.35 // 轻微 S 弯
  const dark = trunkColor === '#8a5a34' ? '#6f4526' : '#5a3a24'
  // 树干主体（上窄下宽，手绘自然）
  const body = `M ${cx - w * 0.55} ${bottomY} Q ${cx - w * 0.5 - bend * 0.2} ${topY + h * 0.35} ${cx - w * 0.32} ${topY} L ${cx + w * 0.32} ${topY} Q ${cx + w * 0.5 + bend * 0.2} ${topY + h * 0.35} ${cx + w * 0.55} ${bottomY} Z`
  // 树皮纹理线（2 条竖纹）
  const texture1 = `M ${cx - w * 0.2} ${bottomY - 6} Q ${cx - w * 0.15} ${topY + h * 0.4} ${cx - w * 0.1} ${topY + 3}`
  const texture2 = `M ${cx + w * 0.18} ${bottomY - 4} Q ${cx + w * 0.12} ${topY + h * 0.5} ${cx + w * 0.06} ${topY + 2}`
  // 树干节（2 个）
  const knot1 = `<ellipse cx="${cx - w * 0.3}" cy="${bottomY - h * 0.25}" rx="${w * 0.09}" ry="${w * 0.06}" fill="${dark}" opacity="0.5" />`
  const knot2 = `<ellipse cx="${cx + w * 0.28}" cy="${bottomY - h * 0.55}" rx="${w * 0.08}" ry="${w * 0.05}" fill="${dark}" opacity="0.4" />`
  // 基部土丘：树干种在土里的堆土（泥土色，压在树根与树干之间）
  const moundW = w * 1.6
  const mound = `<ellipse cx="${cx}" cy="${bottomY - 2}" rx="${moundW}" ry="${w * 0.5}" fill="#a9713d" stroke="#8a5a2c" stroke-width="1" opacity="0.9" />`
  // 露土根：从土丘下方向两侧爬出，在泥土表面可见（4 条，更长更明显）
  const rootW = Math.max(w * 0.38, 3.5)
  const roots = [
    { dir: -1, len: 2.1, dy: 10, bend: 0.7 },
    { dir: -1, len: 1.4, dy: 4, bend: 0.4 },
    { dir: 1, len: 2.1, dy: 10, bend: 0.7 },
    { dir: 1, len: 1.4, dy: 4, bend: 0.4 },
  ]
  const rootPaths = roots.map((r, i) => {
    const startX = cx + r.dir * w * 0.5
    const startY = bottomY - 4
    const endX = cx + r.dir * w * r.len
    const endY = bottomY + r.dy + (i % 2) * 3
    const ctrlX = cx + r.dir * w * r.len * 0.55
    const ctrlY = bottomY - 2 + r.bend * 6
    return `<path d="M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}" fill="none" stroke="${trunkColor}" stroke-width="${i < 2 ? rootW : rootW * 0.75}" stroke-linecap="round" pathLength="100" class="tree-grow-stroke" />`
  })
  return [
    `<path d="${body}" fill="${trunkColor}" stroke="${dark}" stroke-width="1.2" />`,
    `<path d="${texture1}" fill="none" stroke="${dark}" stroke-width="1" opacity="0.4" />`,
    `<path d="${texture2}" fill="none" stroke="${dark}" stroke-width="1" opacity="0.35" />`,
    ...rootPaths,
    mound,
    knot1,
    knot2,
  ]
}

/** 树枝分叉：从主干上部向两侧伸展 */
export function buildBranches(cx: number, topY: number, h: number, w: number, t: number): string {
  if (t <= 0) return ''
  const parts: string[] = []
  const branchLen = 26 + t * 46
  const branchW = 2.5 + t * 2.5
  // 左枝
  const leftY = topY + h * 0.22
  const leftEndX = cx - branchLen
  const leftEndY = leftY - 14 - t * 12
  parts.push(
    `<path d="M ${cx - w * 0.2} ${leftY} Q ${cx - branchLen * 0.5} ${leftY - 4} ${leftEndX} ${leftEndY}" fill="none" stroke="#8a5a34" stroke-width="${branchW}" stroke-linecap="round" pathLength="100" class="tree-grow-stroke" />`
  )
  // 右枝
  const rightY = topY + h * 0.32
  const rightEndX = cx + branchLen * 1.05
  const rightEndY = rightY - 10 - t * 10
  parts.push(
    `<path d="M ${cx + w * 0.2} ${rightY} Q ${cx + branchLen * 0.5} ${rightY - 6} ${rightEndX} ${rightEndY}" fill="none" stroke="#8a5a34" stroke-width="${branchW * 0.9}" stroke-linecap="round" pathLength="100" class="tree-grow-stroke" />`
  )
  // 顶端小枝
  if (t > 0.4) {
    parts.push(
      `<path d="M ${cx} ${topY + 4} Q ${cx + 6} ${topY - 6} ${cx + 12} ${topY - 10}" fill="none" stroke="#8a5a34" stroke-width="${branchW * 0.7}" stroke-linecap="round" pathLength="100" class="tree-grow-stroke" />`
    )
  }
  return parts.join('')
}

/** 树冠生成器（按树种形状）：云冠/花冠/枫冠/锥冠/扇冠，支持季节配色、枯树形态、天气遗产与变异 */
export function buildCrownShape(
  cx: number,
  cy: number,
  r: number,
  count: number,
  fruitT: number,
  species: TreeSpecies,
  season?: Season,
  wither = false,
  birthWeather?: Weather,
  variant?: 'golden'
): string {
  if (count <= 0 || r <= 0) return ''
  const parts: string[] = []
  // 枯树：叶子掉光，仅剩灰褐稀疏残叶
  const [baseMain, baseSide, baseLight] = species.crownColors
  // 金色变异：稀有收藏树（替换全部冠色为金色系）
  const goldenMain = '#d4af37'
  const goldenSide = '#e6c65c'
  const goldenLight = '#f5e08a'
  let [main, side, light] = variant === 'golden'
    ? [goldenMain, goldenSide, goldenLight]
    : wither
      ? ['#9a8a72', '#8a7a62', '#aaa08c']
      : season
        ? [seasonTint(season, baseMain), seasonTint(season, baseSide), seasonTint(season, baseLight)]
        : [baseMain, baseSide, baseLight]
  const stroke = variant === 'golden' ? '#b8962a' : wither ? '#6a5a48' : species.crownStroke
  // 枯树：树冠缩小，叶量减少
  if (wither) {
    r = r * 0.55
    count = Math.min(count, 3)
    fruitT = 0
  }
  // 冬天：常青树（松树）保持绿色，其余树种褪色
  if (season === 'winter' && species.crownType !== 'cone' && !wither) {
    main = '#7a8a7a'
    side = '#6a7a6a'
    light = '#8a9a8a'
    fruitT = 0
  }

  // 底部暗色衬底（体积感）
  parts.push(`<ellipse cx="${cx + 4}" cy="${cy + 6}" rx="${r * 0.95}" ry="${r * 0.78}" fill="${stroke}" opacity="0.85" />`)

  if (species.crownType === 'cone') {
    // 松树：3 层锥形堆叠，错落有致
    const layers = [
      { dy: -r * 0.1, w: r * 1.5, h: r * 1.15 },
      { dy: r * 0.18, w: r * 1.25, h: r * 0.95 },
      { dy: r * 0.42, w: r * 1.0, h: r * 0.75 },
    ]
    for (const layer of layers) {
      parts.push(
        `<path d="M ${cx - layer.w} ${cy + layer.dy} Q ${cx} ${cy + layer.dy - layer.h} ${cx + layer.w} ${cy + layer.dy} Z" fill="${main}" stroke="${stroke}" stroke-width="1.5" />`
      )
    }
    // 雪松高光（顶部亮线）
    parts.push(`<path d="M ${cx - r * 0.5} ${cy - r * 0.55} Q ${cx} ${cy - r * 1.0} ${cx + r * 0.5} ${cy - r * 0.55}" fill="none" stroke="${light}" stroke-width="2" opacity="0.5" />`)
  } else if (species.crownType === 'fan') {
    // 银杏：扇形圆冠，水平延展
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.1}" ry="${r * 0.72}" fill="${main}" />`)
    // 扇叶放射纹理
    for (let i = 0; i < 7; i++) {
      const angle = -1.1 + i * 0.36
      const endX = cx + Math.sin(angle) * r * 0.85
      const endY = cy + Math.cos(angle) * r * 0.6
      parts.push(
        `<path d="M ${cx} ${cy} Q ${cx + Math.sin(angle) * r * 0.4} ${cy + Math.cos(angle) * r * 0.3} ${endX} ${endY}" fill="none" stroke="${light}" stroke-width="1.5" opacity="0.55" />`
      )
    }
    parts.push(`<ellipse cx="${cx - r * 0.4}" cy="${cy - r * 0.3}" rx="${r * 0.45}" ry="${r * 0.3}" fill="${side}" opacity="0.7" />`)
    parts.push(`<ellipse cx="${cx + r * 0.4}" cy="${cy + r * 0.1}" rx="${r * 0.4}" ry="${r * 0.27}" fill="${side}" opacity="0.6" />`)
  } else if (species.crownType === 'maple') {
    // 枫树：多团堆叠 + 星形叶尖点缀
    const clusters = [
      { dx: 0, dy: 0, s: 1 },
      { dx: -r * 0.55, dy: r * 0.12, s: 0.6 },
      { dx: r * 0.58, dy: r * 0.1, s: 0.62 },
      { dx: -r * 0.25, dy: -r * 0.4, s: 0.55 },
      { dx: r * 0.28, dy: -r * 0.38, s: 0.55 },
    ]
    for (const c of clusters) {
      parts.push(
        `<ellipse cx="${cx + c.dx}" cy="${cy + c.dy}" rx="${r * c.s}" ry="${r * c.s * 0.85}" fill="${c.s > 0.8 ? main : side}" stroke="${stroke}" stroke-width="1.2" />`
      )
    }
    // 枫叶星尖（顶部）
    parts.push(`<path d="M ${cx} ${cy - r * 1.15} L ${cx + r * 0.16} ${cy - r * 0.75} L ${cx + r * 0.42} ${cy - r * 0.85} L ${cx + r * 0.18} ${cy - r * 0.5} Z" fill="${light}" opacity="0.8" />`)
  } else {
    // cloud / flower：云朵状团冠（樱花更圆润蓬松）
    const isFlower = species.crownType === 'flower'
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * (isFlower ? 0.9 : 0.82)}" fill="${main}" stroke="${stroke}" stroke-width="1.2" />`)
    const offsets = [
      [-0.72, 0.18, 0.6],
      [0.74, 0.16, 0.62],
      [-0.35, -0.5, 0.52],
      [0.38, -0.48, 0.54],
    ]
    for (let i = 0; i < Math.min(count - 1, offsets.length); i++) {
      const [ox, oy, scale] = offsets[i]
      const rr = r * scale
      parts.push(
        `<ellipse cx="${cx + r * ox}" cy="${cy + r * oy}" rx="${rr}" ry="${rr * (isFlower ? 0.85 : 0.8)}" fill="${side}" stroke="${stroke}" stroke-width="1" />`
      )
    }
    // 高光
    const lightSpots = [
      [-0.45, -0.25, 0.3],
      [0.3, -0.3, 0.24],
      [0, -0.45, 0.2],
    ]
    for (const [ox, oy, scale] of lightSpots) {
      const rr = r * scale
      parts.push(`<ellipse cx="${cx + r * ox}" cy="${cy + r * oy}" rx="${rr}" ry="${rr * 0.75}" fill="${light}" opacity="0.65" />`)
    }
    // 樱花：花瓣飘点
    if (isFlower && fruitT > 0) {
      for (let i = 0; i < 5; i++) {
        const px = cx + (i - 2) * r * 0.38
        const py = cy + r * 0.5 + (i % 2) * 6
        parts.push(`<circle cx="${px}" cy="${py}" r="2.2" fill="#ffffff" opacity="0.7" />`)
      }
    }
  }

  // 果实/花点缀（云冠橡树有果实；樱花有花心点）
  if (fruitT > 0 && count > 5 && species.hasAccent) {
    const spots = [
      [-0.5, 0.1],
      [0.45, -0.05],
      [-0.1, 0.35],
      [0.15, -0.25],
      [-0.62, -0.1],
    ]
    const spotCount = Math.max(1, Math.round(fruitT * spots.length))
    for (let i = 0; i < spotCount; i++) {
      const [ox, oy] = spots[i]
      parts.push(
        `<circle cx="${cx + r * ox}" cy="${cy + r * oy}" r="${3.2 * (0.6 + fruitT * 0.5)}" fill="${species.accentColor}" opacity="0.9" />`
      )
    }
  }

  // 天气遗产：雨天生长的树永久带露珠（亮白小点）
  if (birthWeather === 'rainy' && !wither) {
    const dewSpots = [
      [-0.55, -0.2, 0.1],
      [0.2, -0.4, 0.08],
      [0.5, 0.15, 0.09],
      [-0.15, 0.35, 0.07],
    ]
    for (const [ox, oy, scale] of dewSpots) {
      parts.push(
        `<circle cx="${cx + r * ox}" cy="${cy + r * oy}" r="${r * scale}" fill="#ffffff" opacity="0.85" />`
      )
    }
  }

  // 天气遗产：雪天生长的树冠永久保留少量积雪（顶部白冠）
  if (birthWeather === 'snowy' && !wither) {
    if (species.crownType === 'cone') {
      // 松树：每层顶部积雪
      const layers = [
        { dy: -r * 0.1, w: r * 1.5, h: r * 1.15 },
        { dy: r * 0.18, w: r * 1.25, h: r * 0.95 },
        { dy: r * 0.42, w: r * 1.0, h: r * 0.75 },
      ]
      for (const layer of layers) {
        parts.push(
          `<path d="M ${cx - layer.w * 0.55} ${cy + layer.dy - layer.h * 0.25} Q ${cx} ${cy + layer.dy - layer.h * 0.55} ${cx + layer.w * 0.55} ${cy + layer.dy - layer.h * 0.25} Q ${cx} ${cy + layer.dy - layer.h * 0.35} ${cx - layer.w * 0.55} ${cy + layer.dy - layer.h * 0.25} Z" fill="#ffffff" opacity="0.9" />`
        )
      }
    } else {
      // 阔叶树：树冠顶部白色雪冠
      parts.push(
        `<path d="M ${cx - r * 0.7} ${cy - r * 0.25} Q ${cx} ${cy - r * 0.95} ${cx + r * 0.7} ${cy - r * 0.25} Q ${cx} ${cy - r * 0.5} ${cx - r * 0.7} ${cy - r * 0.25} Z" fill="#ffffff" opacity="0.85" />`
      )
    }
  }

  return parts.join('')
}
