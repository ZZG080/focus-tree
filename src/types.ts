// FocusTree 全局类型定义

/** 专注会话状态机 */
export type SessionStatus = 'idle' | 'running' | 'paused' | 'finished'

/** 专注记录（持久化到 localStorage） */
export interface FocusRecord {
  id: string
  /** 计划时长（分钟） */
  plannedMinutes: number
  /** 实际专注时长（分钟，浮点） */
  actualMinutes: number
  /** 是否完整完成（未提前退出） */
  completed: boolean
  /** 开始时间戳 */
  startedAt: number
  /** 结束时间戳 */
  endedAt: number
  /** 鼓励语（AI 或模板生成） */
  encouragement?: string
  /** 本次专注的天气 */
  weather?: Weather
  /** 本次种下的树数（含当前批次） */
  treeCount?: number
  /** 本次的树种 id（森林地图渲染用） */
  speciesId?: string
  /** 挑战模式双倍奖励加成（完成时 treeCount 翻倍，记录原始数） */
  challengeBonus?: boolean
}

/** 天气类型（storm 仅挑战模式出现：暴风雨生长变慢 + 双倍奖励） */
export type Weather = 'sunny' | 'snowy' | 'rainy' | 'storm'

/** 季节 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

/** 粒子效果类型 */
export type ParticleType = 'none' | 'fireflies' | 'leaves' | 'sakura'

/** AI 共创场景（调色板 + 粒子 + 氛围） */
export interface CustomScene {
  id: string
  name: string
  /** 用户/AI 生成的描述 */
  description: string
  /** 天空渐变 */
  skyTop: string
  skyBottom: string
  /** 草地/泥土色 */
  grass: string
  dirt: string
  /** 粒子效果 */
  particles: ParticleType
  /** 云朵颜色 */
  cloudColor: string
  /** 是否显示太阳 */
  showSun: boolean
  /** 是否内置预置场景 */
  builtin?: boolean
}

/** 生长阶段 */
export type GrowthStage = 'seed' | 'root' | 'sprout' | 'sapling' | 'tree'

/** 生长计算结果 */
export interface GrowthState {
  /** 阶段 */
  stage: GrowthStage
  /** 阶段内进度 0~1 */
  phaseProgress: number
  /** 总进度 0~1（用于整体视觉） */
  totalProgress: number
}

/** 一棵树的种植记录（用于多树遮挡渲染） */
export interface PlantedTree {
  /** 树的落点 X 坐标（viewBox 坐标系） */
  x: number
  /** 第几棵（从 0 开始，越大越新） */
  index: number
  /** 种植时间戳 */
  plantedAt: number
  /** 出生天气（天气遗产：雨天树带露珠，雪天树带积雪，永久独特特征） */
  birthWeather?: Weather
  /** 稀有变异（极低概率的金色树等收藏品） */
  variant?: 'golden'
  /** 树种 id（连携效应判断连续同种） */
  speciesId?: string
}

/** 会话快照（用于刷新后断点恢复） */
export interface SessionSnapshot {
  plannedMinutes: number
  startedAt: number
  /** 已暂停累计毫秒 */
  pausedMs: number
  /** 是否处于暂停 */
  paused: boolean
  /** 当前天气 */
  weather: Weather
  /** 本次种子数 */
  seedCount: number
  /** 生长周期（分钟） */
  growthMinutes: number
  /** 当前批次种子落点 */
  seedXs: number[]
  /** 历史已种树 */
  plantedTrees: PlantedTree[]
  /** 挑战模式（暴风雨） */
  challengeMode?: boolean
}

/** 应用设置 */
export interface Settings {
  /** 默认专注时长（分钟） */
  defaultMinutes: number
  /** 生长周期（一棵树长满的分钟数，真实 90 / 快速演示 25/15/5） */
  growthMinutes: number
  /** 天气 */
  weather: Weather
  /** 每次专注同时落下的种子数（1~3） */
  seedCount: number
  /** 当前选择的树种 id */
  speciesId: string
  /** 已解锁的树种 id 列表（首次解锁后持久化，清记录不丢） */
  unlockedSpecies: string[]
  /** 季节模式：auto 跟随真实月份 / 手动指定 */
  seasonMode: 'auto' | Season
  /** 当前场景 id（场景共创） */
  sceneId: string
  /** 自定义场景列表（AI 共创生成） */
  customScenes: CustomScene[]
  /** 真实天气联动：城市名 */
  city: string
  /** 是否已看过新手引导 */
  onboardingDone: boolean
  /** AI API key（可选，空则用模板） */
  apiKey: string
  /** AI 服务地址（默认 DeepSeek 兼容端点） */
  aiEndpoint: string
  /** AI 模型名 */
  aiModel: string
  /** 挑战模式（暴风雨天气，生长变慢，完成双倍奖励） */
  challengeMode: boolean
  /** 高对比度模式（无障碍：黑白高饱和色系） */
  highContrast: boolean
}
