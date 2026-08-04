// 场景服务：内置预置场景 + AI 共创场景生成
// 用户描述一个场景（如"森林里的萤火虫夜晚"），AI 生成视觉参数（调色板/粒子/氛围）
import type { CustomScene, ParticleType } from '../types'
import { getSettings, saveSettings } from './storageService'

/** 内置预置场景（无需 AI key 即可体验共创理念） */
export const BUILTIN_SCENES: CustomScene[] = [
  {
    id: 'meadow',
    name: '晴日草原',
    description: '蓝天白云，阳光正好，绿草如茵。',
    skyTop: '#7ec8f2',
    skyBottom: '#d8f0fb',
    grass: '#6db95c',
    dirt: '#a9713d',
    particles: 'none',
    cloudColor: '#ffffff',
    showSun: true,
    builtin: true,
  },
  {
    id: 'firefly-night',
    name: '萤火虫之夜',
    description: '深蓝夜空，萤火点点，宁静而神秘。',
    skyTop: '#1a2a4a',
    skyBottom: '#3d5a80',
    grass: '#2e5d3a',
    dirt: '#4a3a28',
    particles: 'fireflies',
    cloudColor: '#4a5a7a',
    showSun: false,
    builtin: true,
  },
  {
    id: 'autumn-path',
    name: '秋叶小径',
    description: '暖橙色调，落叶飘舞，诗意盎然。',
    skyTop: '#e8a05a',
    skyBottom: '#f5d3a0',
    grass: '#b08a4a',
    dirt: '#7a5230',
    particles: 'leaves',
    cloudColor: '#f0dcc0',
    showSun: true,
    builtin: true,
  },
  {
    id: 'sakura-garden',
    name: '樱花庭院',
    description: '粉色花瓣随风轻舞，春意融融。',
    skyTop: '#a8c8e8',
    skyBottom: '#f5e0ea',
    grass: '#7ab85a',
    dirt: '#9a6a4a',
    particles: 'sakura',
    cloudColor: '#ffffff',
    showSun: true,
    builtin: true,
  },
]

/** 所有可用场景 = 内置 + 用户自定义 */
export function getAllScenes(): CustomScene[] {
  const settings = getSettings()
  return [...BUILTIN_SCENES, ...(settings.customScenes ?? [])]
}

/** 按 id 查找场景（回退到晴日草原） */
export function getScene(id: string): CustomScene {
  return getAllScenes().find((s) => s.id === id) ?? BUILTIN_SCENES[0]
}

/** 从 AI 返回的 JSON 文本解析场景（容错处理） */
export function parseSceneJson(raw: string, fallbackName: string): CustomScene | null {
  try {
    // 提取 JSON 块（AI 可能夹杂解释文字）
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    const data = JSON.parse(match[0])
    const validParticles: ParticleType[] = ['none', 'fireflies', 'leaves', 'sakura']
    const particles = validParticles.includes(data.particles) ? data.particles : 'none'
    return {
      id: `custom-${Date.now()}`,
      name: String(data.name ?? fallbackName).slice(0, 30),
      description: String(data.description ?? fallbackName).slice(0, 120),
      skyTop: String(data.skyTop ?? '#7ec8f2'),
      skyBottom: String(data.skyBottom ?? '#d8f0fb'),
      grass: String(data.grass ?? '#6db95c'),
      dirt: String(data.dirt ?? '#a9713d'),
      particles,
      cloudColor: String(data.cloudColor ?? '#ffffff'),
      showSun: data.showSun !== false,
    }
  } catch {
    return null
  }
}

/** 保存一个自定义场景并应用 */
export function addCustomScene(scene: CustomScene): void {
  const settings = getSettings()
  const customScenes = [...(settings.customScenes ?? []), scene]
  saveSettings({ customScenes, sceneId: scene.id })
}

/** 系统提示词：指导 AI 输出场景视觉参数 */
export function buildScenePrompt(description: string): string {
  return [
    '你是一位场景视觉设计师。根据用户的场景描述，输出一个 JSON 对象，定义场景的视觉参数。',
    '只输出 JSON，不要任何其他文字。JSON 格式如下：',
    '{',
    '  "name": "场景名（2-6字中文）",',
    '  "description": "一句话场景描述（20字内）",',
    '  "skyTop": "天空顶部色（hex）",',
    '  "skyBottom": "天空底部色（hex）",',
    '  "grass": "草地色（hex）",',
    '  "dirt": "泥土色（hex）",',
    '  "cloudColor": "云朵色（hex）",',
    '  "particles": "none|fireflies|leaves|sakura（粒子效果：无/萤火虫/落叶/樱花）",',
    '  "showSun": true 或 false',
    '}',
    '要求：配色和谐有氛围感，符合描述的意境。',
    `用户描述：${description}`,
  ].join('\n')
}
