// 树种定义：外观参数 + 解锁条件 + 图鉴信息
// 解锁状态从专注记录推导，首次解锁后持久化（清记录不丢）

export type CrownType = 'cloud' | 'flower' | 'maple' | 'cone' | 'fan'

export interface TreeSpecies {
  id: string
  name: string
  emoji: string
  desc: string
  /** 未解锁时的提示 */
  unlockHint: string
  /** 树冠形状 */
  crownType: CrownType
  /** 树冠主色（多层用） */
  crownColors: string[]
  /** 树冠描边色 */
  crownStroke: string
  /** 树干色 */
  trunkColor: string
  /** 强调色（果实/花） */
  accentColor: string
  /** 是否有果实/花点缀 */
  hasAccent: boolean
  /** 解锁条件（满足任一即可） */
  unlock?: {
    /** 需要完整完成的次数 */
    completedCount?: number
    /** 需要累计分钟数 */
    totalMinutes?: number
  }
}

export const TREE_SPECIES: TreeSpecies[] = [
  {
    id: 'oak',
    name: '橡树',
    emoji: '🌳',
    desc: '沉稳的森林守护者，四季常青，默默生长。',
    unlockHint: '默认解锁',
    crownType: 'cloud',
    crownColors: ['#4caf50', '#57b95a', '#8fd07c'],
    crownStroke: '#3e8e41',
    trunkColor: '#8a5a34',
    accentColor: '#e0564f',
    hasAccent: true,
  },
  {
    id: 'cherry',
    name: '樱花树',
    emoji: '🌸',
    desc: '春日的浪漫，花瓣纷飞，短暂而绚烂。',
    unlockHint: '完整完成 3 次专注后解锁',
    crownType: 'flower',
    crownColors: ['#f7a8c4', '#f8bcd0', '#fdd3e3'],
    crownStroke: '#e08aac',
    trunkColor: '#7a4a3a',
    accentColor: '#ffe1ec',
    hasAccent: true,
    unlock: { completedCount: 3 },
  },
  {
    id: 'maple',
    name: '枫树',
    emoji: '🍁',
    desc: '秋日的火焰，红叶如火，热烈而自由。',
    unlockHint: '累计专注 60 分钟后解锁',
    crownType: 'maple',
    crownColors: ['#d96c3f', '#e0804f', '#f0a060'],
    crownStroke: '#b04a2a',
    trunkColor: '#6f4a2e',
    accentColor: '#c0392b',
    hasAccent: false,
    unlock: { totalMinutes: 60 },
  },
  {
    id: 'pine',
    name: '松树',
    emoji: '🌲',
    desc: '寒冬中的坚守者，风雪中依然苍翠挺拔。',
    unlockHint: '完整完成 8 次专注后解锁',
    crownType: 'cone',
    crownColors: ['#2e6b34', '#3a7d42', '#4c8f52'],
    crownStroke: '#24592a',
    trunkColor: '#6b4a30',
    accentColor: '#5a8f5e',
    hasAccent: false,
    unlock: { completedCount: 8 },
  },
  {
    id: 'ginkgo',
    name: '银杏',
    emoji: '🍂',
    desc: '亿万年的古老生命，金叶如扇，秋光正好。',
    unlockHint: '累计专注 150 分钟后解锁',
    crownType: 'fan',
    crownColors: ['#d9b63a', '#e3c34f', '#f0d668'],
    crownStroke: '#b8962a',
    trunkColor: '#7a5a34',
    accentColor: '#f5e08a',
    hasAccent: false,
    unlock: { totalMinutes: 150 },
  },
]

/** 按 id 查找树种（默认橡树） */
export function getSpecies(id: string): TreeSpecies {
  return TREE_SPECIES.find((s) => s.id === id) ?? TREE_SPECIES[0]
}

/** 计算已解锁的树种 id 集合（基于专注记录） */
export function computeUnlockedSpecies(records: Array<{ completed: boolean; actualMinutes: number }>): Set<string> {
  const unlocked = new Set<string>(['oak']) // 橡树默认
  const completedCount = records.filter((r) => r.completed).length
  const totalMinutes = records.reduce((sum, r) => sum + r.actualMinutes, 0)

  for (const species of TREE_SPECIES) {
    if (species.id === 'oak') continue
    const cond = species.unlock
    if (!cond) continue
    const pass =
      (cond.completedCount !== undefined && completedCount >= cond.completedCount) ||
      (cond.totalMinutes !== undefined && totalMinutes >= cond.totalMinutes)
    if (pass) unlocked.add(species.id)
  }
  return unlocked
}
