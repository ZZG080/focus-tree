// 设置视图 V6：树种图鉴 + 天气（含真实联动）+ 生长周期 + 种子数 + 时长 + AI 配置
import { useEffect, useState } from 'react'
import type { Weather } from '../types'
import { GROWTH_PRESETS } from '../services/growthCurve'
import { clearSnapshot, getSettings, saveSettings } from '../services/storageService'
import { TREE_SPECIES } from '../services/treeSpecies'
import { CITIES, fetchRealWeather } from '../services/weatherService'

interface SetupViewProps {
  onStart: (minutes: number) => void
  onShowHistory: () => void
}

const PRESETS = [15, 25, 45, 60, 90]

const WEATHER_OPTIONS: Array<{ key: Weather; label: string; icon: string; desc: string }> = [
  { key: 'sunny', label: '晴天', icon: '☀️', desc: '正常生长' },
  { key: 'rainy', label: '雨天', icon: '🌧️', desc: '生长加速 15%' },
  { key: 'snowy', label: '雪天', icon: '❄️', desc: '积雪渐厚' },
]

const GROWTH_LABELS: Record<number, string> = {
  90: '真实（90分钟）',
  25: '快速（25分钟）',
  15: '演示（15分钟）',
  5: '极速（5分钟）',
}

export function SetupView({ onStart, onShowHistory }: SetupViewProps) {
  const [settings] = useState(getSettings)
  const [minutes, setMinutes] = useState(settings.defaultMinutes)
  const [weather, setWeather] = useState<Weather>(settings.weather)
  const [seedCount, setSeedCount] = useState(settings.seedCount)
  const [growthMinutes, setGrowthMinutes] = useState(settings.growthMinutes)
  const [speciesId, setSpeciesId] = useState(settings.speciesId)
  const [city, setCity] = useState(settings.city)
  const [weatherLink, setWeatherLink] = useState(false)
  const [linkStatus, setLinkStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [linkedWeather, setLinkedWeather] = useState<Weather | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [endpoint, setEndpoint] = useState(settings.aiEndpoint)
  const [model, setModel] = useState(settings.aiModel)
  const [saved, setSaved] = useState(false)

  const unlocked = new Set(settings.unlockedSpecies)

  // 真实天气联动：选择城市后自动获取当地天气
  useEffect(() => {
    if (!weatherLink) return
    setLinkStatus('loading')
    fetchRealWeather(city).then((real) => {
      if (real) {
        setLinkedWeather(real.weather)
        setWeather(real.weather)
        setLinkStatus('ok')
      } else {
        setLinkStatus('fail')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherLink, city])

  const handleStart = () => {
    const m = Math.min(180, Math.max(1, Math.round(minutes)))
    // 关键修复：新会话必须清除旧快照，避免旧快照的天气/种子数覆盖本次选择
    clearSnapshot()
    saveSettings({ defaultMinutes: m, weather, seedCount, growthMinutes, speciesId, city })
    onStart(m)
  }

  const handleSaveAi = () => {
    saveSettings({ apiKey: apiKey.trim(), aiEndpoint: endpoint.trim(), aiModel: model.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="setup-view">
      <div className="setup-card">
        <h1 className="setup-title">🌱 Focus Tree</h1>
        <p className="setup-subtitle">每一次专注，种下一片森林</p>

        {/* 树种选择（图鉴收集） */}
        <div className="species-picker">
          <div className="picker-label">选择树种</div>
          <div className="species-options">
            {TREE_SPECIES.map((s) => {
              const isUnlocked = unlocked.has(s.id)
              const isActive = speciesId === s.id
              return (
                <button
                  key={s.id}
                  className={`species-option ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                  onClick={() => isUnlocked && setSpeciesId(s.id)}
                  title={isUnlocked ? s.desc : `🔒 ${s.unlockHint}`}
                >
                  <span className="species-emoji">{isUnlocked ? s.emoji : '🔒'}</span>
                  <span className="species-name">{s.name}</span>
                  {isActive && <span className="species-check">✓</span>}
                </button>
              )
            })}
          </div>
          <p className="picker-hint">
            {TREE_SPECIES.find((s) => s.id === speciesId)?.desc}
            {unlocked.size < TREE_SPECIES.length ? '  ·  完成更多专注解锁新树种' : '  ·  图鉴已集齐 🎉'}
          </p>
        </div>

        {/* 天气选择 */}
        <div className="weather-picker">
          <div className="picker-label">选择天气</div>
          <div className="weather-options">
            {WEATHER_OPTIONS.map((w) => (
              <button
                key={w.key}
                className={`weather-option ${weather === w.key ? 'active' : ''}`}
                onClick={() => {
                  setWeather(w.key)
                  setWeatherLink(false) // 手动选择天气时关闭联动
                }}
              >
                <span className="weather-icon">{w.icon}</span>
                <span className="weather-label">{w.label}</span>
                <span className="weather-desc">{w.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 真实天气联动 */}
        <div className="weather-link">
          <div className="picker-label">🌍 真实天气联动</div>
          <div className="link-row">
            <select
              className="city-select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!weatherLink}
            >
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <button
              className={`link-toggle ${weatherLink ? 'on' : ''}`}
              onClick={() => setWeatherLink((v) => !v)}
            >
              {weatherLink ? '已联动' : '开启联动'}
            </button>
          </div>
          {weatherLink && (
            <p className="picker-hint">
              {linkStatus === 'loading' && '正在获取当地天气…'}
              {linkStatus === 'ok' && linkedWeather && `✅ ${city} 当前：${linkedWeather === 'sunny' ? '☀️ 晴' : linkedWeather === 'rainy' ? '🌧️ 雨' : '❄️ 雪'}`}
              {linkStatus === 'fail' && '⚠️ 获取失败（可能无网络），将使用手动天气'}
            </p>
          )}
          <p className="picker-hint">开启后，专注场景将自动跟随所选城市的实时天气</p>
        </div>

        {/* 生长周期选择 */}
        <div className="growth-picker">
          <div className="picker-label">生长周期</div>
          <div className="growth-options">
            {GROWTH_PRESETS.map((g) => (
              <button
                key={g}
                className={`growth-option ${growthMinutes === g ? 'active' : ''}`}
                onClick={() => setGrowthMinutes(g)}
              >
                {GROWTH_LABELS[g]}
              </button>
            ))}
          </div>
          <p className="picker-hint">真实模式让树随时间缓缓成长；演示模式几分钟看完完整生长过程</p>
        </div>

        {/* 种子数选择 */}
        <div className="seed-picker">
          <div className="picker-label">同时种下的种子数</div>
          <div className="seed-options">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`seed-option ${seedCount === n ? 'active' : ''}`}
                onClick={() => setSeedCount(n)}
              >
                {Array.from({ length: n }).map((_, i) => (
                  <span key={i} className="seed-dot">🌰</span>
                ))}
              </button>
            ))}
          </div>
          <p className="picker-hint">多颗种子将同时落下、同步长大，之后每批保持相同数量</p>
        </div>

        {/* 时长选择 */}
        <div className="preset-row">
          {PRESETS.map((m) => (
            <button
              key={m}
              className={`preset-btn ${minutes === m ? 'active' : ''}`}
              onClick={() => setMinutes(m)}
            >
              {m}分
            </button>
          ))}
        </div>

        <div className="custom-row">
          <label className="custom-label">自定义时长</label>
          <input
            type="number"
            min={1}
            max={180}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="custom-input"
          />
          <span className="unit">分钟</span>
        </div>

        <button className="start-btn" onClick={handleStart}>
          🌱 开始专注
        </button>

        <div className="secondary-row">
          <button className="link-btn" onClick={onShowHistory}>
            📖 我的森林
          </button>
          <button className="link-btn" onClick={() => setShowAdvanced((v) => !v)}>
            ✨ 高级设置
          </button>
        </div>

        {showAdvanced && (
          <div className="ai-settings">
            <p className="ai-hint">
              配置后，AI 将为你生成鼓励语、每周总结和共创场景（默认 DeepSeek，兼容 OpenAI 接口）。留空则使用内置模板。
            </p>
            <input
              type="password"
              placeholder="API Key（可选）"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="ai-input"
            />
            <input
              type="text"
              placeholder="API 地址"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="ai-input"
            />
            <input
              type="text"
              placeholder="模型名"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="ai-input"
            />
            <button className="save-btn" onClick={handleSaveAi}>
              {saved ? '✓ 已保存' : '保存设置'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

