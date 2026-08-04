import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/scene.css'
import App from './App'
import { getSettings } from './services/storageService'

// 高对比度模式（无障碍）：启动时按设置切换 body class（设置页切换即时生效）
try {
  if (getSettings().highContrast) {
    document.body.classList.add('high-contrast')
  }
} catch {
  /* ignore */
}

// PWA：注册 Service Worker（app shell 缓存；失败静默——如 dev 模式）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      全局 SVG 滤镜定义（一次性，整个应用共享）：
      rough-paper —— 手绘纸纹质感：feTurbulence 生成噪点场，feDisplacementMap 沿噪点位移源图形，
      让所有引用它的路径（树干/树枝/云朵/地面）呈现轻微抖动的手绘笔触。
      通过 CSS `filter: url(#rough-paper)` 引用，浏览器只计算一次滤镜图。
    */}
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id="rough-paper" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
    <App />
  </StrictMode>,
)
