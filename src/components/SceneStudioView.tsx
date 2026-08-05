// 场景共创工作室：用户描述场景 → AI 生成视觉参数 → 应用/保存
// 无 API key 时使用内置模板（关键词匹配），有 key 时由 AI 生成
import { useState } from 'react'
import { getAllScenes, addCustomScene } from '../services/sceneService'
import { generateScene } from '../services/aiService'
import { getSettings, saveSettings } from '../services/storageService'

interface SceneStudioProps {
  onBack: () => void
  /** 应用场景后回调（回到设置页刷新） */
  onApplied: () => void
}

const PRESET_IDEAS = [
  '森林里的萤火虫夜晚',
  '秋日枫叶小径',
  '海边落日',
  '樱花雨庭院',
  '晨雾竹林',
  '星空下的雪原',
]

export function SceneStudio({ onBack, onApplied }: SceneStudioProps) {
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<{
    name: string
    description: string
    skyTop: string
    skyBottom: string
    grass: string
    dirt: string
    particles: string
    cloudColor: string
    showSun: boolean
  } | null>(null)
  const [applied, setApplied] = useState(false)
  const scenes = getAllScenes()

  const handleGenerate = async () => {
    if (!description.trim() || generating) return
    setGenerating(true)
    setPreview(null)
    setApplied(false)
    const result = await generateScene(description.trim())
    if (result) {
      setPreview(result)
    }
    setGenerating(false)
  }

  const handleApply = () => {
    if (!preview) return
    const scene = {
      id: `custom-${Date.now()}`,
      name: preview.name,
      description: preview.description,
      skyTop: preview.skyTop,
      skyBottom: preview.skyBottom,
      grass: preview.grass,
      dirt: preview.dirt,
      particles: preview.particles as 'none' | 'fireflies' | 'leaves' | 'sakura',
      cloudColor: preview.cloudColor,
      showSun: preview.showSun,
    }
    addCustomScene(scene)
    setApplied(true)
    setTimeout(() => onApplied(), 800)
  }

  return (
    <div className="scene-studio">
      <div className="history-header">
        <div className="eyebrow">SCENE · 场景</div>
        <h1>🎨 场景共创</h1>
        <button className="ghost-btn" onClick={onBack}>← 返回</button>
      </div>

      {/* 输入区 */}
      <div className="scene-input-card">
        <p className="picker-label">描述你想要的场景</p>
        <textarea
          className="scene-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如：森林里的萤火虫夜晚，深蓝天空下萤火点点…"
          rows={3}
          maxLength={100}
        />
        <div className="scene-ideas">
          {PRESET_IDEAS.map((idea) => (
            <button key={idea} className="idea-chip" onClick={() => setDescription(idea)}>
              {idea}
            </button>
          ))}
        </div>
        <button className="start-btn" onClick={handleGenerate} disabled={generating || !description.trim()}>
          {generating ? '✨ 生成中…' : '🎨 生成场景'}
        </button>
        <p className="picker-hint">
          {getSettings().apiKey
            ? 'AI 将根据描述生成配色与粒子效果'
            : '未配置 API Key：使用内置场景模板（配置 Key 后由 AI 完全生成）'}
        </p>
      </div>

      {/* 预览区 */}
      {preview && (
        <div className="scene-preview-card">
          <div
            className="scene-preview-bg"
            style={{
              background: `linear-gradient(180deg, ${preview.skyTop}, ${preview.skyBottom})`,
            }}
          >
            <div className="scene-preview-sun" style={{ opacity: preview.showSun ? 1 : 0 }}>☀️</div>
            <div className="scene-preview-ground" style={{ background: `linear-gradient(180deg, ${preview.grass}, ${preview.dirt})` }} />
            <div className="scene-preview-particle">
              {preview.particles === 'fireflies' && '✨ 萤火虫'}
              {preview.particles === 'leaves' && '🍂 落叶'}
              {preview.particles === 'sakura' && '🌸 樱花'}
              {preview.particles === 'none' && ''}
            </div>
          </div>
          <h3>{preview.name}</h3>
          <p className="scene-preview-desc">{preview.description}</p>
          <div className="scene-colors">
            {[preview.skyTop, preview.skyBottom, preview.grass, preview.dirt, preview.cloudColor].map((c) => (
              <span key={c} className="color-dot" style={{ background: c }} title={c} />
            ))}
          </div>
          <button className="start-btn" onClick={handleApply} disabled={applied}>
            {applied ? '✓ 已应用' : '🌱 应用此场景'}
          </button>
        </div>
      )}

      {/* 已有场景列表 */}
      <div className="collection-panel">
        <div className="collection-header">
          <h2>🗂️ 我的场景库</h2>
          <span className="collection-progress">{scenes.length} 个</span>
        </div>
        <div className="scene-list">
          {scenes.map((s) => (
            <div key={s.id} className="scene-item">
              <div
                className="scene-item-preview"
                style={{ background: `linear-gradient(180deg, ${s.skyTop}, ${s.skyBottom})` }}
              />
              <div className="scene-item-info">
                <div className="scene-item-name">{s.name}</div>
                <div className="scene-item-desc">{s.description}</div>
              </div>
              <button
                className="link-toggle on"
                onClick={() => {
                  saveSettings({ sceneId: s.id })
                  onApplied()
                }}
              >
                使用
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
