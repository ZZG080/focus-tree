// 树渲染组件：仅负责把 treeMath 计算结果渲染为 SVG
// 数学逻辑已拆分到 services/treeMath.ts（纯函数，可单测）
import { memo, useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { GrowthState, Season, Weather } from '../types'
import type { TreeSpecies } from '../services/treeSpecies'
import { getSpecies } from '../services/treeSpecies'
import {
  buildBranches,
  buildCrownShape,
  buildRoots,
  buildTrunk,
  computeTreeParams,
  GROUND_Y,
  SEED_Y,
  TRUNK_BASE,
} from '../services/treeMath'

interface TreeLayersProps {
  growth: GrowthState
  /** 种子是否已落下 */
  seedLanded: boolean
  /** 是否播放镜头聚焦 */
  focusing: boolean
  /** 树的落点 X 坐标 */
  treeX?: number
  /** 遮挡序号：越大越靠后越虚化 */
  layerOrder?: number
  /** 是否已完成静态树 */
  staticTree?: boolean
  /** 树种 id（默认橡树） */
  speciesId?: string
  /** 季节（影响树冠配色） */
  season?: Season
  /** 枯树模式（中途放弃过多） */
  wither?: boolean
  /** 出生天气（天气遗产：露珠/积雪） */
  birthWeather?: Weather
  /** 稀有变异（金色树） */
  variant?: 'golden'
  /** 手绘质感滤镜（桌面端启用，低端设备关闭以省 GPU） */
  handDrawn?: boolean
  /** 阴影方向偏移（动态光影：0~1 太阳进度 → 阴影从西到东） */
  shadowDir?: number
  /** 暂停状态（微交互：暂停时柔光呼吸） */
  paused?: boolean
}

/** 已完成静态树的生长状态（大树） */
const MATURE_GROWTH: GrowthState = { stage: 'tree', phaseProgress: 1, totalProgress: 1 }

/**
 * 描边生长动画样式：stroke-dashoffset 与 totalProgress 同步。
 * 所有描边路径带 pathLength="100"（SVG 归一化长度），因此：
 *   dasharray = "100 100"（虚线单元 = 整条路径长度）
 *   dashoffset = 100 * (1 - totalProgress)（偏移量随生长进度缩小 → 路径从起点"画"到终点）
 * 静态树（totalProgress=1）offset=0 → 完整显示，无动画开销。
 */
function growStrokeStyle(totalProgress: number, staticTree: boolean): CSSProperties {
  if (staticTree) return {}
  const t = Math.max(0, Math.min(1, totalProgress))
  return {
    strokeDasharray: '100 100',
    strokeDashoffset: `${100 * (1 - t)}`,
  }
}

/**
 * 根系层组件：单独渲染根系，用于"泥土之下"图层
 * 树根扎进土里，从泥土边缘露出——真实"有根"效果
 * memo + 生长阈值比较：rAF 每帧 elapsedMs 变化不触发重渲染
 */
export const TreeRoots = memo(function TreeRoots({
  growth,
  treeX = 500,
  layerOrder = 0,
  staticTree = false,
}: {
  growth: GrowthState
  treeX?: number
  layerOrder?: number
  staticTree?: boolean
}) {
  const effGrowth = staticTree ? MATURE_GROWTH : growth

  // 几何计算缓存：仅依赖生长参数
  const { rootLen, rootT, trunkW } = useMemo(() => computeTreeParams(effGrowth), [effGrowth])
  const cx = treeX

  // 遮挡虚化
  const blurAmount = layerOrder > 0 ? Math.min(layerOrder * 0.9, 4.5) : 0
  const opacity = layerOrder > 0 ? Math.max(0.85 - layerOrder * 0.18, 0.4) : 1

  // SVG 字符串缓存：仅当根系参数变化时重建
  const rootsHtml = useMemo(() => {
    if (rootLen <= 2) return ''
    return buildRoots(cx, TRUNK_BASE, rootLen, rootT, trunkW)
  }, [cx, rootLen, rootT, trunkW])

  if (!rootsHtml) return null
  return (
    <g
      className="tree-grow-stroke"
      style={{
        opacity,
        filter: blurAmount > 0 ? `blur(${blurAmount}px)` : undefined,
        ...growStrokeStyle(effGrowth.totalProgress, staticTree),
      }}
    >
      {/* 根从树干底部两侧向泥土深处延伸（描边绘制生长动画） */}
      <g dangerouslySetInnerHTML={{ __html: rootsHtml }} />
    </g>
  )
}, treeRootsEquals)

/** 生长状态阈值比较：rAF 每帧微变视为相等，避免无谓重渲染 */
function growthEquals(prev: GrowthState, next: GrowthState): boolean {
  return (
    prev.stage === next.stage &&
    Math.abs(prev.phaseProgress - next.phaseProgress) < 0.01 &&
    Math.abs(prev.totalProgress - next.totalProgress) < 0.01
  )
}

/** 比较函数：生长状态用阈值比较（rAF 每帧微变不重渲染），其他 prop 严格相等 */
function treeLayersEquals(prev: TreeLayersProps, next: TreeLayersProps): boolean {
  return (
    growthEquals(prev.growth, next.growth) &&
    prev.seedLanded === next.seedLanded &&
    prev.focusing === next.focusing &&
    prev.treeX === next.treeX &&
    prev.layerOrder === next.layerOrder &&
    prev.staticTree === next.staticTree &&
    prev.speciesId === next.speciesId &&
    prev.season === next.season &&
    prev.wither === next.wither &&
    prev.birthWeather === next.birthWeather &&
    prev.variant === next.variant &&
    prev.handDrawn === next.handDrawn &&
    prev.shadowDir === next.shadowDir &&
    prev.paused === next.paused
  )
}

/** 根系层比较器（仅生长 + 位置） */
function treeRootsEquals(
  prev: { growth: GrowthState; treeX?: number; layerOrder?: number; staticTree?: boolean },
  next: { growth: GrowthState; treeX?: number; layerOrder?: number; staticTree?: boolean }
): boolean {
  return (
    growthEquals(prev.growth, next.growth) &&
    prev.treeX === next.treeX &&
    prev.layerOrder === next.layerOrder &&
    prev.staticTree === next.staticTree
  )
}

/**
 * 地上层组件：种子/树干/树枝/树冠（泥土之上）
 * memo + 生长阈值比较：rAF 每帧 elapsedMs 变化不触发重渲染
 */
export const TreeLayers = memo(function TreeLayers({
  growth,
  seedLanded,
  focusing,
  treeX = 500,
  layerOrder = 0,
  staticTree = false,
  speciesId = 'oak',
  season,
  wither = false,
  birthWeather,
  variant,
  handDrawn: _handDrawn = false,
  shadowDir = 0.5,
  paused = false,
}: TreeLayersProps) {
  const effGrowth = staticTree ? MATURE_GROWTH : growth
  const species: TreeSpecies = getSpecies(speciesId)
  const cx = treeX

  // 几何计算缓存：仅依赖生长状态
  const params = useMemo(() => computeTreeParams(effGrowth), [effGrowth])
  const { trunkH, trunkW, trunkTopY, crownR, leafCount, branchT, fruitT } = params

  // 遮挡虚化 + 老树记忆褪色（远处树降饱和，模拟大气透视/记忆褪色）
  const blurAmount = layerOrder > 0 ? Math.min(layerOrder * 0.9, 4.5) : 0
  const opacity = layerOrder > 0 ? Math.max(0.85 - layerOrder * 0.18, 0.4) : 1
  const saturate = layerOrder > 0 ? Math.max(1 - layerOrder * 0.12, 0.6) : 1
  const filterStyle =
    blurAmount > 0 || saturate < 1
      ? `${blurAmount > 0 ? `blur(${blurAmount}px)` : ''} ${saturate < 1 ? `saturate(${saturate})` : ''}`.trim()
      : undefined

  // 枯树：树干灰化，叶量缩减
  const trunkColor = wither ? '#7a7268' : species.trunkColor
  const effCrownR = wither ? crownR * 0.55 : crownR
  // 树冠中心 Y：基于「实际渲染半径」计算，系数 0.3 让树冠底部深入树干顶部 0.52r
  // 保证树冠始终扎实地"坐在"树干上（完整态重叠 ≈61px，wither 缩冠后 ≈33px，早期小冠 ≈16px），
  // 杜绝"树干树冠分离"的视觉缝隙（此前用完整 crownR×0.4 计算，wither 时重叠仅 ~6px）
  const crownY = trunkTopY - effCrownR * 0.3

  const showSeed = (!seedLanded || effGrowth.totalProgress < 0.05) && !staticTree
  const showTrunk = trunkH > 3
  const showBranches = branchT > 0 && !wither // 枯树无新枝
  const showCrown = effCrownR > 2

  // SVG 字符串缓存：树干/树枝/树冠只在对应参数变化时重建（避免每帧重建大字符串）
  const trunkHtml = useMemo(
    () => (showTrunk ? buildTrunk(cx, TRUNK_BASE, trunkTopY, trunkW, trunkColor).join('') : ''),
    [showTrunk, cx, trunkTopY, trunkW, trunkColor]
  )
  const branchesHtml = useMemo(
    () => (showBranches ? buildBranches(cx, trunkTopY, trunkH, trunkW, branchT) : ''),
    [showBranches, cx, trunkTopY, trunkH, trunkW, branchT]
  )
  const crownHtml = useMemo(
    () => (showCrown ? buildCrownShape(cx, crownY, effCrownR, leafCount, fruitT, species, season, wither, birthWeather, variant) : ''),
    [showCrown, cx, crownY, effCrownR, leafCount, fruitT, species, season, wither, birthWeather, variant]
  )

  return (
    <g
      className={`${focusing ? 'tree-focus-anim' : ''} ${paused ? 'tree-paused-glow' : ''} ${staticTree ? 'tree-hoverable' : 'tree-growing-glow'}`}
      style={{
        transformOrigin: `${cx}px ${GROUND_Y}px`,
        opacity,
        filter: filterStyle,
      }}
    >
      {/* 树枝分叉：V10 矢量树无外露树枝（buildBranches 恒空，保留占位） */}
      {branchesHtml && (
        <g dangerouslySetInnerHTML={{ __html: branchesHtml }} />
      )}

      {/* 树干/茎（底部深入泥土，与根系连接；纯色矢量——放弃手绘滤镜与描边绘制） */}
      {trunkHtml && (
        <g dangerouslySetInnerHTML={{ __html: trunkHtml }} />
      )}

      {/* 树冠（按树种形状 + 季节配色 + 枯树形态；叶片渐显弹出动画；悬停时轻微摇摆） */}
      {crownHtml && (
        <g
          className="crown-grow tree-crown-sway"
          style={{ transformOrigin: `${cx}px ${TRUNK_BASE}px` }}
          dangerouslySetInnerHTML={{ __html: crownHtml }}
        />
      )}

      {/* 动态光影：树影随太阳方向移动（太阳左→阴影右，正午最短） */}
      {showCrown && staticTree && (
        <ellipse
          cx={cx + (shadowDir - 0.5) * 60}
          cy={TRUNK_BASE + 8}
          rx={effCrownR * 0.75 * (0.75 + 0.25 * Math.abs(shadowDir - 0.5) * 2)}
          ry={effCrownR * 0.16}
          fill="rgba(30, 50, 30, 0.16)"
          style={{ transition: 'transform 2s linear' }}
        />
      )}

      {/* 种子（落地前从天空落下，落地后逐渐埋入） */}
      {showSeed && (
        <g className={seedLanded ? 'seed-buried' : 'seed-falling'}>
          <ellipse
            cx={cx}
            cy={seedLanded ? SEED_Y - 6 : GROUND_Y - 60}
            rx="9"
            ry="13"
            fill="#a4722f"
            stroke="#7a5230"
            strokeWidth="2"
            transform={seedLanded ? `rotate(25 ${cx} ${SEED_Y - 6})` : ''}
          />
          {/* 种子纹理 */}
          <path
            d={`M ${cx - 3} ${seedLanded ? SEED_Y - 3 : GROUND_Y - 57} Q ${cx} ${seedLanded ? SEED_Y + 3 : GROUND_Y - 51} ${cx + 3} ${seedLanded ? SEED_Y - 3 : GROUND_Y - 57}`}
            stroke="#7a5230"
            strokeWidth="1.2"
            fill="none"
            opacity="0.7"
          />
        </g>
      )}
    </g>
  )
}, treeLayersEquals)
