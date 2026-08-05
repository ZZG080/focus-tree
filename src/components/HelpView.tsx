// 用户指导手册：内嵌在应用中的完整使用说明（覆盖 V1~V9 全部功能）
import { useEffect, useState } from 'react'

interface HelpViewProps {
  onBack: () => void
}

/** 目录项：锚点 id + 标题 */
const TOC = [
  { id: 'intro', icon: '🌱', title: '这是什么' },
  { id: 'quickstart', icon: '🚀', title: '快速开始' },
  { id: 'focus', icon: '⏱️', title: '专注模式' },
  { id: 'weather', icon: '🌦️', title: '天气与环境' },
  { id: 'challenge', icon: '⚡', title: '挑战模式' },
  { id: 'species', icon: '🌲', title: '树种与图鉴' },
  { id: 'forest', icon: '🗺️', title: '森林与统计' },
  { id: 'scene', icon: '🎨', title: '场景工作室' },
  { id: 'immersion', icon: '✨', title: '沉浸视觉' },
  { id: 'ai', icon: '🤖', title: 'AI 鼓励语' },
  { id: 'pwa', icon: '📲', title: '安装与通知' },
  { id: 'a11y', icon: '♿', title: '无障碍' },
  { id: 'faq', icon: '❓', title: '常见问题' },
  { id: 'privacy', icon: '🔒', title: '数据与隐私' },
]

const FAQS = [
  {
    q: '专注中途切走页面/锁屏，进度会丢吗？',
    a: '不会。计时基于真实时间戳，刷新或重新打开页面后会自动恢复快照（包括已种下的树、天气、种子数量）。',
  },
  {
    q: '为什么我的树枯萎了？',
    a: '连续 2 次以上提前结束专注会触发“枯树惩罚”——下一次专注的树会枯萎。完整完成一次专注即可恢复生机。',
  },
  {
    q: '「生长周期」和「专注时长」有什么区别？',
    a: '专注时长 = 本次倒计时总长；生长周期 = 一棵树从种子长成大树需要的时间。周期短于时长时，一棵树长成会自动落下新种子，一次专注可种多批树。',
  },
  {
    q: '金色树怎么获得？',
    a: '每棵树长成时有 1% 概率变异为稀有金色树（天气遗产树冠上会保留露珠/积雪标记）。纯运气，多专注即可遇见。',
  },
  {
    q: '雨天真的会加速生长吗？',
    a: '是的，雨天生长速度 ×1.15；挑战模式的暴风雨则相反（×0.6），但完整完成奖励双倍树数。',
  },
  {
    q: '解锁的树种会丢吗？',
    a: '不会。已解锁树种单独持久化，即使清空专注记录也保留。',
  },
  {
    q: 'AI 鼓励语需要配置什么？',
    a: '在设置页的 AI 配置区填入 API Key 与端点即可启用真实 AI；不配置时使用内置模板兜底，功能不受影响。',
  },
  {
    q: '离线能用吗？',
    a: '可以。页面是纯前端应用，数据存本地；安装为 PWA 后首次加载即缓存全部资源，离线可正常专注（真实天气联动与 AI 除外）。',
  },
]

export function HelpView({ onBack }: HelpViewProps) {
  // 目录高亮：滚动时跟踪当前章节
  const [active, setActive] = useState('intro')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    document.querySelectorAll<HTMLElement>('[data-help-section]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="help-view">
      <div className="help-header">
        <div className="eyebrow">GUIDE · 手册</div>
        <h1>📘 用户指导手册</h1>
        <button className="ghost-btn" onClick={onBack}>← 返回</button>
      </div>

      {/* 目录（粘性侧栏/顶部横条） */}
      <nav className="help-toc" aria-label="手册目录">
        {TOC.map((t) => (
          <a key={t.id} href={`#${t.id}`} className={`help-toc-item ${active === t.id ? 'active' : ''}`}>
            <span>{t.icon}</span>
            <span>{t.title}</span>
          </a>
        ))}
      </nav>

      <div className="help-content">
        {/* ========== 1 这是什么 ========== */}
        <section className="help-section glass-panel" id="intro" data-help-section>
          <h2>🌱 这是什么</h2>
          <p>
            <strong>FocusTree（专注森林）</strong>把每一次专注时间可视化为一棵树：进入专注后种子从天而降，
            随时间真实流逝逐渐生根、发芽、长成大树。专注结束，你的森林就多一棵树。
            它用“种树”的成长隐喻 + AI 情感反馈，让坚持专注这件事变得可见、有陪伴感。
          </p>
          <div className="help-features">
            <div className="help-feature"><span>🎨</span><div><b>手绘沉浸视觉</b><p>静谧夜林风格：月亮、星尘、手绘纸纹、动态光影</p></div></div>
            <div className="help-feature"><span>⏱️</span><div><b>真实时间生长</b><p>生长动画与真实时间严格对应，刷新不丢进度</p></div></div>
            <div className="help-feature"><span>🧩</span><div><b>丰富玩法</b><p>天气遗产、金色变异、连携效应、暴风雨挑战</p></div></div>
            <div className="help-feature"><span>🔒</span><div><b>本地优先</b><p>纯前端应用，数据保存在你自己的设备</p></div></div>
          </div>
        </section>

        {/* ========== 2 快速开始 ========== */}
        <section className="help-section glass-panel" id="quickstart" data-help-section>
          <h2>🚀 快速开始</h2>
          <ol className="help-steps">
            <li><b>打开「专注」页</b>：设置专注时长（1~180 分钟）、选择树种、天气与生长周期</li>
            <li><b>点击「开始专注」</b>：种子落下，镜头聚焦，树随真实时间生长</li>
            <li><b>专注结束</b>：查看本次记录与 AI 鼓励语，前往「森林」查看你的森林</li>
          </ol>
          <p className="help-note">💡 新手提示：第一次使用建议先用 5 分钟快速模式（生长周期选 5 分钟），几分钟内就能看完一棵树的一生。</p>
        </section>

        {/* ========== 3 专注模式 ========== */}
        <section className="help-section glass-panel" id="focus" data-help-section>
          <h2>⏱️ 专注模式详解</h2>
          <table className="help-table">
            <thead><tr><th>功能</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td>种子落下</td><td>进入专注后 1~3 粒种子（可在设置调整数量）从天空落下，镜头聚焦后拉远</td></tr>
              <tr><td>多树批次</td><td>多种子同时落下、同步长大；大树长成后自动在随机位置落新种子，循环种树</td></tr>
              <tr><td>生长周期</td><td>90 分钟真实模式，或 25/15/5 分钟快速演示；周期短于专注时长即可种多批</td></tr>
              <tr><td>暂停 / 继续</td><td>暂停时树呈柔光呼吸；计时不计入暂停时长，恢复后继续生长</td></tr>
              <tr><td>提前结束</td><td>点击「结束」退出；连续 2 次提前结束会触发枯树惩罚（下一棵枯萎）</td></tr>
              <tr><td>断点恢复</td><td>刷新/关闭页面后重新打开，自动恢复未完成的专注（含已种树）</td></tr>
              <tr><td>树长大通知</td><td>每棵树长成时发送系统通知（需授权），切走页面也不会错过</td></tr>
            </tbody>
          </table>
        </section>

        {/* ========== 4 天气与环境 ========== */}
        <section className="help-section glass-panel" id="weather" data-help-section>
          <h2>🌦️ 天气与环境</h2>
          <table className="help-table">
            <thead><tr><th>天气</th><th>效果</th></tr></thead>
            <tbody>
              <tr><td>☀️ 晴天</td><td>月亮与星尘辉映的夜空，生长速度正常</td></tr>
              <tr><td>🌧️ 雨天</td><td>雨幕 + 地面涟漪，生长加速 15%</td></tr>
              <tr><td>❄️ 雪天</td><td>雪花飘摆，草地积雪渐厚、切走后缓慢消融</td></tr>
              <tr><td>🌍 真实联动</td><td>设置页选城市后，专注场景自动跟随当地实时天气</td></tr>
            </tbody>
          </table>
          <p className="help-note">✨ <b>天气遗产</b>：雨天生长的树永久带露珠，雪天生长的树冠顶永久留雪——每棵树都独一无二。</p>
        </section>

        {/* ========== 5 挑战模式 ========== */}
        <section className="help-section glass-panel" id="challenge" data-help-section>
          <h2>⚡ 挑战模式</h2>
          <p>在设置页开启「挑战模式」后，专注场景变为<strong>暴风雨</strong>：暗色雨幕、闪电劈闪、狂风。</p>
          <ul className="help-list">
            <li>🌧️ 生长速度减缓 40%（树更难长成，更有紧迫感）</li>
            <li>🏆 完整完成专注 → 本次种下的树数<strong>双倍奖励</strong>（结果页显示 ⚡ 挑战双倍徽章）</li>
            <li>⚠️ 提前结束无奖励；挑战模式天气锁定为暴风雨，不可切换</li>
          </ul>
        </section>

        {/* ========== 6 树种与图鉴 ========== */}
        <section className="help-section glass-panel" id="species" data-help-section>
          <h2>🌲 树种与图鉴</h2>
          <p>默认解锁橡树，完成专注次数或累计时长即可解锁新树种（樱花、枫树、松树、银杏等）。在「森林」页查看图鉴与解锁进度。</p>
          <div className="help-features">
            <div className="help-feature"><span>🌳</span><div><b>橡树</b><p>初始树种 · 云冠结实</p></div></div>
            <div className="help-feature"><span>🌸</span><div><b>樱花</b><p>花冠 · 花瓣粒子场景</p></div></div>
            <div className="help-feature"><span>🍁</span><div><b>枫树</b><p>枫冠 · 秋色落叶场景</p></div></div>
            <div className="help-feature"><span>🌲</span><div><b>松树</b><p>锥冠 · 四季常青</p></div></div>
            <div className="help-feature"><span>🌳</span><div><b>银杏</b><p>扇冠 · 金黄秋色</p></div></div>
            <div className="help-feature"><span>✨</span><div><b>金色变异</b><p>1% 概率 · 稀有收藏树</p></div></div>
          </div>
        </section>

        {/* ========== 7 森林与统计 ========== */}
        <section className="help-section glass-panel" id="forest" data-help-section>
          <h2>🗺️ 森林与统计</h2>
          <ul className="help-list">
            <li><b>森林总览</b>：已种树总数、树冠横幅</li>
            <li><b>森林地图</b>：2D 网格可视化最近 48 次专注，每格一棵会话树（按树种/天气/挑战标记），悬停查看详情</li>
            <li><b>专注记录</b>：每次的时长、树数、天气、挑战双倍标记与 AI 鼓励语</li>
            <li><b>统计面板</b>：专注次数、总分钟、≈ 番茄数、完整完成数</li>
            <li><b>周报</b>：AI 生成的每周森林成长总结（需在设置中配置 API Key）</li>
            <li><b>清空记录</b>：一键清空专注记录（已解锁树种保留）</li>
          </ul>
        </section>

        {/* ========== 8 场景工作室 ========== */}
        <section className="help-section glass-panel" id="scene" data-help-section>
          <h2>🎨 场景工作室</h2>
          <ul className="help-list">
            <li><b>预置场景</b>：草地、秋日、樱吹雪、萤火之夜等多套配色可直接选用</li>
            <li><b>AI 共创</b>：输入一句话描述（如“月光下的紫色薰衣草田”），AI 生成专属天空/草地/泥土配色与粒子效果</li>
            <li><b>粒子系统</b>：萤火虫 / 落叶（受风力摇摆）/ 樱花，增强氛围</li>
          </ul>
        </section>

        {/* ========== 9 沉浸视觉 ========== */}
        <section className="help-section glass-panel" id="immersion" data-help-section>
          <h2>✨ 沉浸视觉彩蛋</h2>
          <ul className="help-list">
            <li><b>手绘纸纹</b>：所有树干、树枝、云朵经过 rough-paper 滤镜，呈现铅笔与水彩质感</li>
            <li><b>月亮轨迹</b>：月亮随专注进度东升西落，光晕脉动（专注时长 = 一个夜晚）</li>
            <li><b>星尘粒子</b>：42 颗微光尘埃缓慢漂移，夜间氛围感</li>
            <li><b>描边生长</b>：树根与树枝以“画笔绘制”的方式生长（stroke-dashoffset 动画）</li>
            <li><b>呼吸发光</b>：当前生长的树散发绿色呼吸光晕</li>
            <li><b>悬停互动</b>：悬停已长成的树，树冠轻轻摇摆</li>
            <li><b>连携效应</b>：连续种下 3 棵同种树，树旁长出蘑菇与小花丛</li>
            <li><b>老树褪色</b>：后排老树降饱和 + 虚化，模拟记忆褪色与大气透视</li>
            <li><b>风力物理</b>：落叶与雨幕随阵风水平摇摆</li>
          </ul>
        </section>

        {/* ========== 10 AI 鼓励语 ========== */}
        <section className="help-section glass-panel" id="ai" data-help-section>
          <h2>🤖 AI 鼓励语</h2>
          <p>每次专注结束会生成一句鼓励语。默认使用内置模板（离线可用）；在「设置 → AI 配置」填入 API Key、服务端点与模型名后，启用真实 AI 生成（支持 DeepSeek 等兼容 OpenAI 协议的端点）。</p>
          <p className="help-note">🔐 API Key 只保存在本地浏览器，不会上传到任何第三方。</p>
        </section>

        {/* ========== 11 PWA ========== */}
        <section className="help-section glass-panel" id="pwa" data-help-section>
          <h2>📲 安装与通知</h2>
          <ul className="help-list">
            <li><b>安装为应用</b>：浏览器地址栏出现安装图标（或 菜单 → 安装 FocusTree）即可像原生 App 一样全屏使用</li>
            <li><b>离线可用</b>：首次加载后资源本地缓存，断网也能专注（真实天气/AI 除外）</li>
            <li><b>系统通知</b>：开始专注时浏览器会请求通知权限；允许后每棵树长成都会弹出通知</li>
            <li><b>点击通知</b>：自动回到应用页面</li>
          </ul>
        </section>

        {/* ========== 12 无障碍 ========== */}
        <section className="help-section glass-panel" id="a11y" data-help-section>
          <h2>♿ 无障碍</h2>
          <ul className="help-list">
            <li><b>高对比度模式</b>：设置页一键切换黑白高饱和配色，照顾色弱/视障用户</li>
            <li><b>低性能设备</b>：移动端自动关闭重滤镜动画（树冠摇摆/呼吸发光降级），保证流畅</li>
            <li><b>流体排版</b>：字号随屏幕自适应（clamp），触控目标 ≥44px</li>
          </ul>
        </section>

        {/* ========== 13 FAQ ========== */}
        <section className="help-section glass-panel" id="faq" data-help-section>
          <h2>❓ 常见问题</h2>
          {FAQS.map((f, i) => (
            <details key={i} className="help-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        {/* ========== 14 数据与隐私 ========== */}
        <section className="help-section glass-panel" id="privacy" data-help-section>
          <h2>🔒 数据与隐私</h2>
          <ul className="help-list">
            <li>专注记录、设置、场景配置全部保存在<strong>本地浏览器</strong>（localStorage + IndexedDB），不上传任何服务器</li>
            <li>真实天气：仅调用 Open-Meteo 公开接口获取你选择城市的天气，无需登录</li>
            <li>AI 功能：仅在配置了 API Key 时请求你指定的服务端点</li>
            <li>清除浏览器站点数据会删除全部记录，导出备份请自行截图保存</li>
          </ul>
        </section>
      </div>

      <div className="help-footer">
        <button className="start-btn" onClick={onBack}>🌱 开始专注</button>
      </div>
    </div>
  )
}
