// localStorage 持久化服务
import type { FocusRecord, SessionSnapshot, Settings } from '../types'

const KEYS = {
  records: 'focus-tree:records',
  settings: 'focus-tree:settings',
  snapshot: 'focus-tree:session-snapshot',
} as const

/** 默认设置 */
export const DEFAULT_SETTINGS: Settings = {
  defaultMinutes: 25,
  growthMinutes: 90,
  weather: 'sunny',
  seedCount: 1,
  speciesId: 'oak',
  unlockedSpecies: ['oak'],
  seasonMode: 'auto',
  sceneId: 'meadow',
  customScenes: [],
  city: '北京',
  onboardingDone: false,
  apiKey: '',
  aiEndpoint: 'https://api.deepseek.com/chat/completions',
  aiModel: 'deepseek-chat',
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 存储满或隐私模式时静默失败
  }
}

// ---------- 专注记录 ----------

export function getRecords(): FocusRecord[] {
  return safeRead<FocusRecord[]>(KEYS.records, [])
}

export function addRecord(record: FocusRecord): FocusRecord[] {
  const records = getRecords()
  records.unshift(record) // 最新在前
  safeWrite(KEYS.records, records)
  return records
}

export function clearRecords(): void {
  localStorage.removeItem(KEYS.records)
}

// ---------- 设置 ----------

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...safeRead<Partial<Settings>>(KEYS.settings, {}) }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  safeWrite(KEYS.settings, next)
  return next
}

/**
 * 持久化解锁的树种（合并保存，确保清记录后解锁不丢失）。
 * 返回合并后的已解锁列表。
 */
export function persistUnlockedSpecies(newIds: string[]): string[] {
  const settings = getSettings()
  const merged = Array.from(new Set([...settings.unlockedSpecies, ...newIds]))
  saveSettings({ unlockedSpecies: merged })
  return merged
}

// ---------- 会话快照（断点恢复） ----------

export function getSnapshot(): SessionSnapshot | null {
  return safeRead<SessionSnapshot | null>(KEYS.snapshot, null)
}

export function saveSnapshot(snapshot: SessionSnapshot): void {
  safeWrite(KEYS.snapshot, snapshot)
}

export function clearSnapshot(): void {
  localStorage.removeItem(KEYS.snapshot)
}
