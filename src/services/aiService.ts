// AI 服务：鼓励语 + 每周总结报告 + 场景共创生成
import type { FocusRecord } from '../types'
import { getSettings } from './storageService'

/** 内置鼓励语模板（无 API key 时使用） */
const BUILTIN_MESSAGES = [
  '你种下了一棵专注之树。每一分钟的坚持都在让它的根扎得更深。',
  '树木不会一夜长成，专注也是。今天的每一分钟都算数。',
  '根系在地下默默生长，正如你的积累，终将破土成林。',
  '专注不是和时间赛跑，而是和成长同行。你做到了。',
  '这一棵树记下了你的努力。森林正在一点点成形。',
]

/** 根据实际专注分钟数生成一段鼓励语 */
export async function generateEncouragement(actualMinutes: number, completed: boolean): Promise<string> {
  const settings = getSettings()
  const rounded = Math.round(actualMinutes)

  // 有 API key：调用兼容 OpenAI 的 chat/completions 端点
  if (settings.apiKey) {
    try {
      const response = await fetch(settings.aiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.aiModel,
          messages: [
            {
              role: 'system',
              content:
                '你是一位温柔而真诚的专注力教练。请用 1-2 句话为刚完成专注的用户写一句鼓励语，语言自然、不油腻、不空洞，结合用户实际的专注时长。',
            },
            {
              role: 'user',
              content: `我${completed ? '完成了' : '专注了'} ${rounded} 分钟的专注${completed ? '' : '（提前结束）'}，请给我一句鼓励。`,
            },
          ],
          max_tokens: 120,
          temperature: 0.9,
        }),
      })
      if (!response.ok) throw new Error(`AI 服务响应异常: ${response.status}`)
      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content?.trim()
      if (text) return text
    } catch (err) {
      console.warn('[aiService] AI 调用失败，回退到内置模板:', err)
    }
  }

  // 兜底：内置模板 + 时长前缀
  const base = BUILTIN_MESSAGES[Math.floor(Math.random() * BUILTIN_MESSAGES.length)]
  return completed ? base : `（提前结束）${base}`
}

/** 通用 AI 调用（有 key 调 API，无 key 返回 null） */
async function callAI(systemPrompt: string, userContent: string): Promise<string | null> {
  const settings = getSettings()
  if (!settings.apiKey) return null
  try {
    const response = await fetch(settings.aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 600,
        temperature: 0.9,
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content?.trim()
    return text || null
  } catch {
    return null
  }
}

/** 本周专注数据摘要 */
function summarizeWeek(records: FocusRecord[]): string {
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
  const week = records.filter((r) => r.startedAt >= weekAgo)
  const totalMin = week.reduce((s, r) => s + r.actualMinutes, 0)
  const completed = week.filter((r) => r.completed).length
  const days = new Set(week.map((r) => new Date(r.startedAt).toDateString())).size
  // 按小时统计效率最高的时段
  const hourCounts = new Map<number, number>()
  for (const r of week) {
    const h = new Date(r.startedAt).getHours()
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1)
  }
  const bestHour = hourCounts.size
    ? [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : -1
  return `本周共 ${week.length} 次专注，完整完成 ${completed} 次，累计 ${Math.round(totalMin)} 分钟，覆盖 ${days} 天。最常开始专注的时段：${bestHour >= 0 ? `${bestHour}:00 前后` : '暂无数据'}。`
}

/** 生成每周总结报告（AI 个性化，无 key 用模板） */
export async function generateWeeklyReport(records: FocusRecord[]): Promise<{ title: string; content: string }> {
  const summary = summarizeWeek(records)
  const week = records.filter((r) => r.startedAt >= Date.now() - 7 * 24 * 3600 * 1000)
  const weekCount = week.length

  // 模板兜底（无 key 时）
  if (weekCount === 0) {
    return {
      title: '本周暂无专注记录',
      content: '这周还没有种下树。别担心，森林总是从第一棵开始的——现在就去开始一次专注吧 🌱',
    }
  }

  const ai = await callAI(
    '你是一位温暖真诚的专注力教练，擅长基于数据做个性化总结。用 120-180 字中文输出，分 2-3 个短段落，语气自然不油腻。',
    `这是用户的专注数据摘要：${summary}\n请生成一份温暖的每周总结，包含：1) 对本周表现的肯定；2) 一个基于数据的具体观察；3) 一条下周的小建议。不要空话，要具体。`
  )
  if (ai) {
    return { title: '📈 本周专注报告', content: ai }
  }
  // 无 AI 时的本地分析
  const totalMin = week.reduce((s, r) => s + r.actualMinutes, 0)
  const completed = week.filter((r) => r.completed).length
  const days = new Set(week.map((r) => new Date(r.startedAt).toDateString())).size
  return {
    title: '📈 本周专注报告',
    content: `本周你种下了 ${weekCount} 棵树，其中完整长成 ${completed} 棵，累计专注 ${Math.round(totalMin)} 分钟，覆盖 ${days} 天。每棵树都见证了你的坚持——继续保持，森林正在成形 🌳`,
  }
}

/** AI 场景共创：描述 → 场景视觉参数 */
export async function generateScene(description: string): Promise<{
  name: string
  description: string
  skyTop: string
  skyBottom: string
  grass: string
  dirt: string
  particles: string
  cloudColor: string
  showSun: boolean
} | null> {
  // 无 key 时使用内置模板（基于关键词匹配的简易共创）
  const settings = getSettings()
  if (!settings.apiKey) {
    return builtinSceneFallback(description)
  }
  const ai = await callAI(
    '你是一位场景视觉设计师。严格输出一个 JSON 对象，不要任何其他文字。格式：{"name":"场景名","description":"一句话描述","skyTop":"#hex","skyBottom":"#hex","grass":"#hex","dirt":"#hex","cloudColor":"#hex","particles":"none|fireflies|leaves|sakura","showSun":true}。配色要和谐、有意境。',
    `请为以下描述设计场景：${description}`
  )
  if (!ai) return builtinSceneFallback(description)
  try {
    const match = ai.match(/\{[\s\S]*\}/)
    if (!match) return builtinSceneFallback(description)
    const data = JSON.parse(match[0])
    return {
      name: String(data.name ?? '共创场景').slice(0, 30),
      description: String(data.description ?? description).slice(0, 120),
      skyTop: String(data.skyTop ?? '#7ec8f2'),
      skyBottom: String(data.skyBottom ?? '#d8f0fb'),
      grass: String(data.grass ?? '#6db95c'),
      dirt: String(data.dirt ?? '#a9713d'),
      particles: String(data.particles ?? 'none'),
      cloudColor: String(data.cloudColor ?? '#ffffff'),
      showSun: data.showSun !== false,
    }
  } catch {
    return builtinSceneFallback(description)
  }
}

/** 无 API key 时的简易场景生成（关键词匹配） */
function builtinSceneFallback(description: string): {
  name: string
  description: string
  skyTop: string
  skyBottom: string
  grass: string
  dirt: string
  particles: string
  cloudColor: string
  showSun: boolean
} {
  const d = description.toLowerCase()
  if (d.includes('萤火虫') || d.includes('夜晚') || d.includes('夜')) {
    return { name: '萤火之夜', description: '深蓝夜空，萤火点点', skyTop: '#1a2a4a', skyBottom: '#3d5a80', grass: '#2e5d3a', dirt: '#4a3a28', particles: 'fireflies', cloudColor: '#4a5a7a', showSun: false }
  }
  if (d.includes('秋') || d.includes('枫') || d.includes('落叶')) {
    return { name: '秋日私语', description: '暖橙色调，落叶飘舞', skyTop: '#e8a05a', skyBottom: '#f5d3a0', grass: '#b08a4a', dirt: '#7a5230', particles: 'leaves', cloudColor: '#f0dcc0', showSun: true }
  }
  if (d.includes('樱') || d.includes('春') || d.includes('花')) {
    return { name: '春日花语', description: '花瓣轻舞，春意融融', skyTop: '#a8c8e8', skyBottom: '#f5e0ea', grass: '#7ab85a', dirt: '#9a6a4a', particles: 'sakura', cloudColor: '#ffffff', showSun: true }
  }
  if (d.includes('海') || d.includes('沙滩')) {
    return { name: '海边漫步', description: '海风轻拂，碧波荡漾', skyTop: '#5ab8e0', skyBottom: '#c8eef5', grass: '#8ab85a', dirt: '#d8c48a', particles: 'none', cloudColor: '#ffffff', showSun: true }
  }
  return { name: '晨光森林', description: '晨雾弥漫，光影斑驳', skyTop: '#7eb8d8', skyBottom: '#d8f0e0', grass: '#5aa85a', dirt: '#8a5a30', particles: 'none', cloudColor: '#f0f8ff', showSun: true }
}
