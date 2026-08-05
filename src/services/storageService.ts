// 存储服务：IndexedDB 主存储（专注记录可上万条不阻塞）+ localStorage 同步缓存兜底
// 设计：写入双落（IDB 异步 + LS 同步），读取优先 IDB（异步），同步读取走 LS 缓存
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
  challengeMode: false,
  highContrast: false,
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

// ---------- IndexedDB（专注记录主存储） ----------

const DB_NAME = 'focus-tree'
const DB_VERSION = 1
const STORE_RECORDS = 'records'

/** 打开 IndexedDB（惰性单例，失败返回 null——回退 localStorage） */
let dbPromise: Promise<IDBDatabase | null> | null = null
function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          db.createObjectStore(STORE_RECORDS, { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

function idbAll(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result as unknown[])
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, storeName: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function idbClear(db: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ---------- 专注记录 ----------

// ---------- 枯树池（游戏化惩罚机制） ----------
// 提前结束种下的树是枯树；后续完成专注时 1:1 复苏替代（复苏完才正常新增树）
const WITHER_POOL_KEY = 'focus-tree:wither-pool'

/** 读取待复苏枯树数 */
export function getWitherPool(): number {
  const v = Number(safeRead<number>(WITHER_POOL_KEY, 0))
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0
}

/** 设置待复苏枯树数 */
export function setWitherPool(n: number): void {
  safeWrite(WITHER_POOL_KEY, Math.max(0, Math.floor(n)))
}

/** 同步读取（localStorage 缓存——用于热路径/统计即时展示） */
export function getRecords(): FocusRecord[] {
  return safeRead<FocusRecord[]>(KEYS.records, [])
}

/** 异步读取（IndexedDB 主存储；失败回退 localStorage；无数据时合并 LS 旧数据迁移） */
export async function getRecordsAsync(): Promise<FocusRecord[]> {
  try {
    const db = await openDB()
    if (!db) return getRecords()
    const all = (await idbAll(db, STORE_RECORDS)) as FocusRecord[]
    if (all.length === 0) {
      // 首次迁移：把 localStorage 里的旧记录搬进 IDB
      const legacy = getRecords()
      if (legacy.length > 0) {
        for (const r of legacy) await idbPut(db, STORE_RECORDS, r)
        return legacy
      }
    }
    return all
  } catch {
    return getRecords()
  }
}

/** 新增记录（双写：IDB 异步 + LS 同步；fire-and-forget 兼容） */
export function addRecord(record: FocusRecord): FocusRecord[] {
  const records = getRecords()
  records.unshift(record) // 最新在前
  safeWrite(KEYS.records, records)
  // IndexedDB 异步落盘（不阻塞 UI；失败静默，LS 缓存仍可用）
  openDB().then((db) => {
    if (db) idbPut(db, STORE_RECORDS, record).catch(() => {})
  })
  return records
}

/** 清空记录（双清） */
export function clearRecords(): void {
  localStorage.removeItem(KEYS.records)
  openDB().then((db) => {
    if (db) idbClear(db, STORE_RECORDS).catch(() => {})
  })
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
