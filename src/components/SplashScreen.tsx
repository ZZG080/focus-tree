// 启动加载页：Logo 动画（种子破土成树）+ 简化版快速上手速览
import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onDone: () => void
}

/** 简化版使用速览（启动页内嵌）：4 条核心用法 */
const QUICK_TIPS = [
  { icon: '⏱️', text: '设置时长，点击开始' },
  { icon: '🌰', text: '种子落下，随真实时间生长' },
  { icon: '🌳', text: '长成大树，自动种下一棵' },
  { icon: '📖', text: '在「森林」见证你的成长' },
]

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [stage, setStage] = useState(0) // 0=种子 1=发芽 2=小树 3=完成

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 700),
      setTimeout(() => setStage(2), 1400),
      setTimeout(() => setStage(3), 2100),
      setTimeout(onDone, 3400),
    ]
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="splash-screen">
      <div className="splash-logo">
        {/* 动画场景：种子 → 芽 → 树 */}
        <div className={`splash-stage stage-${stage}`}>
          {stage === 0 && <div className="splash-seed">🌰</div>}
          {stage >= 1 && <div className="splash-sprout">🌱</div>}
          {stage >= 2 && <div className="splash-tree">🌳</div>}
          <div className="splash-ground" />
        </div>
        <h1 className="splash-title">Focus Tree</h1>
        <p className="splash-subtitle">每一次专注，种下一片森林</p>

        {/* 简化版快速上手（启动页内嵌） */}
        <div className="splash-tips">
          {QUICK_TIPS.map((t, i) => (
            <div key={i} className="splash-tip" style={{ animationDelay: `${0.5 + i * 0.25}s` }}>
              <span className="splash-tip-icon">{t.icon}</span>
              <span className="splash-tip-text">{t.text}</span>
            </div>
          ))}
        </div>

        <div className="splash-loader">
          <span className="splash-loader-bar" />
        </div>
      </div>
    </div>
  )
}
