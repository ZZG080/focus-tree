// 启动加载页：Logo 动画（种子破土成树），随后进入应用
import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onDone: () => void
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [stage, setStage] = useState(0) // 0=种子 1=发芽 2=小树 3=完成

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 700),
      setTimeout(() => setStage(2), 1400),
      setTimeout(() => setStage(3), 2100),
      setTimeout(onDone, 2800),
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
        <div className="splash-loader">
          <span className="splash-loader-bar" />
        </div>
      </div>
    </div>
  )
}
