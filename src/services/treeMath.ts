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

/** 小数部分（确定性伪随机辅助：fract(sin(i * a) * b) 生成 0~1 稳定值） */
export function fract(x: number): number {
  return x - Math.floor(x)
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

  // 主干：0.15 破土，0.17~0.28 快速伸出，之后长高到 160（卡通树比例：矮胖短干，
  // 树干高 ≈ 树冠直径 0.68 倍——参考启动页树 冠:干 ≈ 1.4:1 的圆润观感）
  let trunkH = 0
  let trunkW = 0
  if (t > 0.15) {
    const stemT = easeOut(clamp((t - 0.15) / 0.13))
    const growT = easeOut(clamp((t - 0.28) / 0.72))
    trunkH = stemT * 55 + growT * 105
    trunkW = 6 + stemT * 6 + growT * 18
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

/** 树干：V10.2 极简矢量卡通干——纯色圆润直干（上窄下宽）+ 底部喇叭口与根融合
 * 放弃手绘元素：无树皮纹理线、无树干节、无土丘、无露土根（根在泥土下由 buildRoots 呈现）
 * 返回 SVG 片段数组
 */
export function buildTrunk(cx: number, bottomY: number, topY: number, w: number, trunkColor: string): string[] {
  if (w <= 2) return []
  const h = bottomY - topY
  const bend = w * 0.2 // 轻微 S 弯
  const dark = trunkColor === '#8a5a34' ? '#6f4526' : '#5a3a24'
  // 主体：圆润直干，底部喇叭口展开 0.8w（与根系起点融合，根茎干连贯）
  const body = `M ${cx - w * 0.3} ${topY} Q ${cx - w * 0.42 - bend * 0.2} ${topY + h * 0.38} ${cx - w * 0.62} ${bottomY} Q ${cx - w * 0.82} ${bottomY + w * 0.22} ${cx - w * 0.18} ${bottomY + w * 0.16} L ${cx + w * 0.18} ${bottomY + w * 0.16} Q ${cx + w * 0.82} ${bottomY + w * 0.22} ${cx + w * 0.62} ${bottomY} Q ${cx + w * 0.42 + bend * 0.2} ${topY + h * 0.38} ${cx + w * 0.3} ${topY} Z`
  return [
    `<path d="${body}" fill="${trunkColor}" stroke="${dark}" stroke-width="1" />`,
  ]
}

/** 树枝分叉：V10 启动页树样式——无外露树枝，树干直顶圆冠（🌳 简洁观感）。
 * 保留函数签名兼容，直接返回空：冠与干的连接由 crownY 重叠逻辑保证
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildBranches(_cx: number, _topY: number, _h: number, _w: number, _t: number): string {
  return ''
}

/** 树冠生成器 V10.1（两层圆冠卡通造型——按用户提供的参考图：上小圆 + 下大圆堆叠，简洁明快）
 * 各品种差异化生长动画：
 *  - cloud（橡树）  ：下圆先膨胀 → 上圆随后弹出（两层堆叠）
 *  - flower（樱花） ：同两层 + 花瓣点缀
 *  - maple（枫树）  ：两层圆冠 + 掌形叶纹
 *  - cone（松树）   ：3 层圆滑锥从下往上逐层叠加
 *  - fan（银杏）    ：两层圆冠 + 扇叶放射纹
 * 支持季节配色、枯树形态、天气遗产与变异
 */
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

  if (species.crownType === 'cone') {
    // ===== 松树：3 层圆滑锥，从下往上叠加（底部最宽先出现，顶部最后长高） =====
    const layers = [
      { dy: r * 0.5, w: r * 1.45, h: r * 1.1, tint: side },   // 底层（最先）
      { dy: r * 0.16, w: r * 1.12, h: r * 1.0, tint: main },  // 中层
      { dy: -r * 0.18, w: r * 0.78, h: r * 0.9, tint: light }, // 顶层（最后）
    ]
    layers.forEach((layer, li) => {
      // 用 count 表达层数进度：count 3~7 开底层，8~9 开中层，10 开顶层
      const open = count >= 3 + li * 3
      if (!open) return
      const grow = Math.min(1, (count - 3 - li * 3) / 3 + 0.25) // 层内生长
      const w2 = layer.w * (0.6 + 0.4 * grow)
      const h2 = layer.h * (0.55 + 0.45 * grow)
      parts.push(
        `<path d="M ${cx - w2} ${cy + layer.dy} Q ${cx} ${cy + layer.dy - h2} ${cx + w2} ${cy + layer.dy} Q ${cx} ${cy + layer.dy + h2 * 0.16} ${cx - w2} ${cy + layer.dy} Z" fill="${layer.tint}" stroke="${stroke}" stroke-width="1.5" />`
      )
    })
    // 雪松高光（顶部亮线）
    if (count >= 9) {
      parts.push(`<path d="M ${cx - r * 0.45} ${cy - r * 0.62} Q ${cx} ${cy - r * 1.05} ${cx + r * 0.45} ${cy - r * 0.62}" fill="none" stroke="${light}" stroke-width="2" opacity="0.5" />`)
    }
    // 鳞片细节：每层锥面叠小椭圆鳞叶（让松树更细致）
    const scaleN = 8 + Math.round(count * 1.5)
    for (let i = 0; i < scaleN; i++) {
      const u = fract(Math.sin(i * 23.7) * 43758.5453)
      const v = fract(Math.sin(i * 47.1) * 12543.123)
      // 沿锥面分布：越靠上越窄
      const ty = v * 0.95
      const coneW = r * 1.45 * (1 - ty * 0.55)
      const lx = cx + (u - 0.5) * coneW * 1.4
      const ly = cy + r * 0.5 - ty * r * 1.05
      const lr = r * (0.07 + v * 0.09)
      const tint = v > 0.6 ? light : main
      parts.push(`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * 0.7).toFixed(1)}" fill="${tint}" opacity="0.8" />`)
    }
  } else if (species.crownType === 'maple') {
    // ===== 枫树：密集叶冠（红叶层）+ 掌形纹理——干净矢量但细节丰富 =====
    // 基底（深色打底，轮廓完整）
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.88}" fill="${stroke}" opacity="0.9" />`)
    // 密集叶片层：确定性伪随机分布（半球冠面，径向 4 色梯度）
    const leafN = 30 + Math.round(count * 2)
    for (let i = 0; i < leafN; i++) {
      const u = fract(Math.sin(i * 12.9898) * 43758.5453)
      const v = fract(Math.sin(i * 78.233) * 12543.123)
      const ang = u * Math.PI * 2
      const rad = 0.3 + v * 0.85
      const lx = cx + Math.cos(ang) * r * rad
      const ly = cy + Math.sin(ang) * r * rad * 0.55 + r * 0.22
      const lr = r * (0.08 + v * 0.14)
      const tint = rad > 0.82 ? light : rad > 0.55 ? main : side
      parts.push(`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * 0.82).toFixed(1)}" fill="${tint}" opacity="0.92" />`)
    }
    // 顶部亮叶（高光层）
    for (let i = 0; i < 6; i++) {
      const u = fract(Math.sin(i * 91.7) * 43758.5453)
      const lx = cx + (u - 0.5) * r * 1.1
      const ly = cy - r * (0.25 + fract(Math.sin(i * 51.3) * 43758.5453) * 0.45)
      const lr = r * (0.09 + fract(Math.sin(i * 33.9) * 43758.5453) * 0.07)
      parts.push(`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * 0.8).toFixed(1)}" fill="${light}" opacity="0.8" />`)
    }
  } else if (species.crownType === 'fan') {
    // ===== 银杏：密集金叶冠 + 扇叶放射纹 =====
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.0}" ry="${r * 0.85}" fill="${stroke}" opacity="0.9" />`)
    const leafN = 30 + Math.round(count * 2)
    for (let i = 0; i < leafN; i++) {
      const u = fract(Math.sin(i * 12.9898) * 43758.5453)
      const v = fract(Math.sin(i * 78.233) * 12543.123)
      const ang = u * Math.PI * 2
      const rad = 0.3 + v * 0.85
      const lx = cx + Math.cos(ang) * r * rad
      const ly = cy + Math.sin(ang) * r * rad * 0.55 + r * 0.2
      const lr = r * (0.08 + v * 0.13)
      const tint = rad > 0.82 ? light : rad > 0.55 ? main : side
      parts.push(`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * 0.82).toFixed(1)}" fill="${tint}" opacity="0.92" />`)
    }
    // 扇叶放射纹理：从中心向外
    const veinCount = Math.max(0, Math.floor((count - 3) * 1.2))
    for (let i = 0; i < veinCount; i++) {
      const angle = -1.15 + (i / Math.max(1, veinCount - 1)) * 2.3
      const endX = cx + Math.sin(angle) * r * 0.92
      const endY = cy + Math.cos(angle) * r * 0.62
      parts.push(
        `<path d="M ${cx} ${cy} Q ${cx + Math.sin(angle) * r * 0.45} ${cy + Math.cos(angle) * r * 0.3} ${endX} ${endY}" fill="none" stroke="${light}" stroke-width="1.5" opacity="0.55" />`
      )
    }
    // 顶部亮叶
    for (let i = 0; i < 5; i++) {
      const u = fract(Math.sin(i * 91.7) * 43758.5453)
      const lx = cx + (u - 0.5) * r * 1.05
      const ly = cy - r * (0.22 + fract(Math.sin(i * 51.3) * 43758.5453) * 0.42)
      const lr = r * (0.09 + fract(Math.sin(i * 33.9) * 43758.5453) * 0.06)
      parts.push(`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * 0.8).toFixed(1)}" fill="${light}" opacity="0.8" />`)
    }
  } else {
    // ===== cloud（橡树）/ flower（樱花）：密集叶冠——细节丰富的矢量卡通树 =====
    // 放弃"三大圆"简约设计：基底 + 30~50 片小叶铺满冠面（径向 4 色梯度：深→中→浅→亮）
    const isFlower = species.crownType === 'flower'
    // 基底（深色打底，保证轮廓完整 + 与树干重叠处不露缝）
    parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * (isFlower ? 0.9 : 0.88)}" fill="${stroke}" opacity="0.92" />`)
    // 中层主色叶（覆盖冠面主体）
    const leafN = 30 + Math.round(count * 2.4)
    for (let i = 0; i < leafN; i++) {
      const u = fract(Math.sin(i * 12.9898) * 43758.5453)
      const v = fract(Math.sin(i * 78.233) * 12543.123)
      const ang = u * Math.PI * 2
      const rad = 0.3 + v * 0.85
      const lx = cx + Math.cos(ang) * r * rad
      const ly = cy + Math.sin(ang) * r * rad * 0.52 + r * 0.2
      const lr = r * (0.08 + v * 0.14)
      const tint = rad > 0.82 ? side : main
      parts.push(`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * 0.85).toFixed(1)}" fill="${tint}" opacity="0.95" />`)
    }
    // 顶部亮叶层（高光，6-8 片）
    const topLeafN = 6 + Math.round(count * 0.3)
    for (let i = 0; i < topLeafN; i++) {
      const u = fract(Math.sin(i * 91.7) * 43758.5453)
      const v = fract(Math.sin(i * 51.3) * 43758.5453)
      const lx = cx + (u - 0.5) * r * 1.15
      const ly = cy - r * (0.15 + v * 0.55)
      const lr = r * (0.09 + fract(Math.sin(i * 33.9) * 43758.5453) * 0.08)
      parts.push(`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * 0.82).toFixed(1)}" fill="${light}" opacity="0.85" />`)
    }
    // 边缘外凸小叶（让轮廓有叶片层次感，不呆板）
    const edgeLeafN = 10
    for (let i = 0; i < edgeLeafN; i++) {
      const u = fract(Math.sin(i * 137.1) * 43758.5453)
      const v = fract(Math.sin(i * 61.7) * 12543.123)
      const ang = u * Math.PI * 2
      const lx = cx + Math.cos(ang) * r * 1.02
      const ly = cy + Math.sin(ang) * r * 0.62 + r * 0.18
      const lr = r * (0.1 + v * 0.08)
      const tint = v > 0.5 ? side : main
      parts.push(`<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * 0.85).toFixed(1)}" fill="${tint}" opacity="0.9" />`)
    }
    // 樱花：花瓣飘点（花心点）
    if (isFlower && fruitT > 0) {
      for (let i = 0; i < 5; i++) {
        const px = cx + (i - 2) * r * 0.36
        const py = cy + r * 0.45 + (i % 2) * 6
        parts.push(`<circle cx="${px}" cy="${py}" r="2.2" fill="#ffffff" opacity="0.75" />`)
      }
    }
  }

  // 果实/花点缀（圆冠橡树有果实；樱花有花心点）
  if (fruitT > 0 && count > 5 && species.hasAccent) {
    const spots = [
      [-0.5, 0.25],
      [0.45, 0.1],
      [-0.1, 0.52],
      [0.15, -0.18],
      [-0.62, 0.0],
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
      [-0.55, -0.1, 0.1],
      [0.2, -0.3, 0.08],
      [0.5, 0.25, 0.09],
      [-0.15, 0.45, 0.07],
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
        { dy: r * 0.5, w: r * 1.45, h: r * 1.1 },
        { dy: r * 0.16, w: r * 1.12, h: r * 1.0 },
        { dy: -r * 0.18, w: r * 0.78, h: r * 0.9 },
      ]
      for (const layer of layers) {
        parts.push(
          `<path d="M ${cx - layer.w * 0.5} ${cy + layer.dy - layer.h * 0.3} Q ${cx} ${cy + layer.dy - layer.h * 0.62} ${cx + layer.w * 0.5} ${cy + layer.dy - layer.h * 0.3} Q ${cx} ${cy + layer.dy - layer.h * 0.42} ${cx - layer.w * 0.5} ${cy + layer.dy - layer.h * 0.3} Z" fill="#ffffff" opacity="0.9" />`
        )
      }
    } else {
      // 阔叶树：顶冠白色雪冠
      parts.push(
        `<path d="M ${cx - r * 0.5} ${cy - r * 0.66} Q ${cx} ${cy - r * 1.05} ${cx + r * 0.5} ${cy - r * 0.66} Q ${cx} ${cy - r * 0.78} ${cx - r * 0.5} ${cy - r * 0.66} Z" fill="#ffffff" opacity="0.85" />`
      )
    }
  }

  return parts.join('')
}
