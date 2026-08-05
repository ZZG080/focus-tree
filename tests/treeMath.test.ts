// treeMath 纯函数单元测试：树形几何计算（不依赖 React）
import { describe, it, expect } from 'vitest'
import {
  computeTreeParams,
  buildRoots,
  buildTrunk,
  buildBranches,
  buildCrownShape,
  SEED_Y,
  TRUNK_BASE,
} from '../src/services/treeMath'
import { TREE_SPECIES } from '../src/services/treeSpecies'

describe('computeTreeParams 树形参数（连续无跳变）', () => {
  it('t=0（种子期）：无根无干无冠', () => {
    const p = computeTreeParams({ stage: 'seed', phaseProgress: 0, totalProgress: 0 })
    expect(p.rootLen).toBe(0)
    expect(p.trunkH).toBe(0)
    expect(p.crownR).toBe(0)
  })

  it('t=0.1（根系期）：根开始舒展，树干未出', () => {
    const p = computeTreeParams({ stage: 'root', phaseProgress: 0.5, totalProgress: 0.1 })
    expect(p.rootLen).toBeGreaterThan(0)
    expect(p.trunkH).toBe(0)
  })

  it('t=0.5（大树中期）：干冠已成型，树枝出现', () => {
    const p = computeTreeParams({ stage: 'tree', phaseProgress: 0.5, totalProgress: 0.5 })
    expect(p.trunkH).toBeGreaterThan(100)
    expect(p.crownR).toBeGreaterThan(50)
    expect(p.branchT).toBeGreaterThan(0)
  })

  it('t=1（长成）：树冠达到最大，果实出现', () => {
    const p = computeTreeParams({ stage: 'tree', phaseProgress: 1, totalProgress: 1 })
    expect(p.crownR).toBeGreaterThan(100)
    expect(p.fruitT).toBeGreaterThan(0.9)
    // 树干顶部在种子之上（往天空方向）
    expect(p.trunkTopY).toBeLessThan(SEED_Y)
  })

  it('参数在相邻帧连续（无跳变）：0.5 与 0.51 差异小', () => {
    const a = computeTreeParams({ stage: 'tree', phaseProgress: 0.5, totalProgress: 0.5 })
    const b = computeTreeParams({ stage: 'tree', phaseProgress: 0.51, totalProgress: 0.51 })
    expect(Math.abs(a.trunkH - b.trunkH)).toBeLessThan(20)
    expect(Math.abs(a.crownR - b.crownR)).toBeLessThan(10)
  })
})

describe('buildRoots 根系 SVG 生成', () => {
  it('长度不足时不生成（防无效 SVG）', () => {
    expect(buildRoots(500, TRUNK_BASE, 1, 0, 10)).toBe('')
  })

  it('正常生成包含主根路径', () => {
    const svg = buildRoots(500, TRUNK_BASE, 80, 0.8, 18)
    expect(svg).toContain('<path')
    expect(svg).toContain('M ')
    expect(svg.length).toBeGreaterThan(200)
  })

  it('根从树干底部（TRUNK_BASE）延伸，保证根茎连接', () => {
    const svg = buildRoots(500, TRUNK_BASE, 80, 0.8, 18)
    // 主根从树干底部出发（y === TRUNK_BASE）——根茎连接的保证
    const starts = [...svg.matchAll(/M ([\d.]+) ([\d.]+)/g)].map((m) => parseFloat(m[2]))
    const mainRoots = starts.filter((y) => y === TRUNK_BASE)
    expect(mainRoots.length).toBeGreaterThanOrEqual(7) // 7 条主根
    // 所有分叉（侧根须/细须根）起点都位于泥土深处（向下延伸）
    const branchRoots = starts.filter((y) => y > TRUNK_BASE)
    expect(branchRoots.length).toBeGreaterThan(0)
    for (const y of branchRoots) {
      expect(y).toBeGreaterThan(TRUNK_BASE)
    }
  })
})

describe('buildTrunk 树干 SVG 生成', () => {
  it('宽度过小时返回空（幼苗期无干）', () => {
    expect(buildTrunk(500, TRUNK_BASE, 400, 1, '#8a5a34')).toEqual([])
  })

  it('V10.3 矢量卡通干：纯色干 + 喇叭口 + 4 条可见露土根（根茎干连贯）', () => {
    const parts = buildTrunk(500, TRUNK_BASE, 300, 18, '#8a5a34')
    const svg = parts.join('')
    expect(parts.length).toBe(5) // 主体 + 4 条露土根
    expect(svg).toContain('fill="#8a5a34"') // 树干色
    expect(svg).toContain(' Z') // 闭合形状
    // 矢量露土根：4 条圆头曲线（泥土表面可见）
    expect(svg.match(/stroke-linecap="round"/g)?.length ?? 0).toBe(4)
    // 手绘元素保持移除
    expect(svg).not.toContain('#a9713d') // 无土丘
    expect(svg).not.toContain('tree-grow-stroke') // 无描边绘制动画
  })
})

describe('buildBranches 树枝', () => {
  it('t=0 无树枝', () => {
    expect(buildBranches(500, 300, 200, 18, 0)).toBe('')
  })

  it('V10 圆冠树无外露树枝（树干直顶圆冠）', () => {
    // 新设计：启动页树样式，树枝隐藏，冠与干由 crownY 重叠连接
    expect(buildBranches(500, 300, 200, 18, 0.8)).toBe('')
  })
})

describe('buildCrownShape 树冠（按树种）', () => {
  it('五种树冠形状均能生成', () => {
    for (const species of TREE_SPECIES) {
      const svg = buildCrownShape(500, 300, 100, 10, 1, species)
      expect(svg.length).toBeGreaterThan(100)
      // 使用该树种主色
      expect(svg).toContain(species.crownColors[0])
    }
  })

  it('枯树形态：颜色灰褐化，叶量缩减', () => {
    const oak = TREE_SPECIES[0]
    const svg = buildCrownShape(500, 300, 100, 10, 1, oak, undefined, true)
    expect(svg).toContain('#9a8a72') // 枯树主色
    expect(svg).not.toContain(oak.crownColors[0]) // 不再使用原绿
  })

  it('冬天非松树褪色', () => {
    const oak = TREE_SPECIES[0]
    const svg = buildCrownShape(500, 300, 100, 10, 1, oak, 'winter')
    expect(svg).toContain('#7a8a7a') // 冬季灰绿
  })

  it('天气遗产：雨天生长的树带露珠', () => {
    const oak = TREE_SPECIES[0]
    const svg = buildCrownShape(500, 300, 100, 10, 1, oak, undefined, false, 'rainy')
    // 露珠：白色高光小圆点
    expect(svg.match(/fill="#ffffff"/g)?.length ?? 0).toBeGreaterThanOrEqual(3)
  })

  it('天气遗产：雪天生长的树带雪冠', () => {
    const oak = TREE_SPECIES[0]
    const svg = buildCrownShape(500, 300, 100, 10, 1, oak, undefined, false, 'snowy')
    expect(svg).toContain('#ffffff')
    // 雪冠形状（弧线路径）
    expect(svg).toContain('Q ')
  })

  it('天气遗产：松树雪天每层积雪', () => {
    const pine = TREE_SPECIES.find((s) => s.id === 'pine')!
    const svg = buildCrownShape(500, 300, 100, 10, 1, pine, undefined, false, 'snowy')
    // 多层积雪（>=2 个白色雪冠）
    expect(svg.match(/fill="#ffffff"/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it('变异树种：金色树冠替换原色', () => {
    const oak = TREE_SPECIES[0]
    const svg = buildCrownShape(500, 300, 100, 10, 1, oak, undefined, false, undefined, 'golden')
    expect(svg).toContain('#d4af37') // 金色主色
    expect(svg).not.toContain(oak.crownColors[0]) // 不再使用原绿
  })
})
