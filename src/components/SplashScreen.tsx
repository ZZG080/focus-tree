// 启动加载页：Logo 动画（种子破土成树，自绘圆冠小树与专注场景同风格）+ 简化版快速上手速览
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

/** 自绘成长小树：种子 → 芽 → 密集叶冠树（根→茎→干→冠 连贯，与专注场景同语言：矢量细致风） */
function GrowthTree({ stage }: { stage: number }) {
  const showRoots = stage >= 1
  const showSprout = stage >= 1
  const showCrown = stage >= 2
  const grown = stage >= 3
  // 确定性叶片分布（与 treeMath 同风格：密集小叶 + 亮叶 + 边缘叶）
  const fract = (x: number) => x - Math.floor(x)
  const leaves: Array<[number, number, number, string]> = []
  if (showCrown) {
    for (let i = 0; i < 22; i++) {
      const u = fract(Math.sin(i * 12.9898) * 43758.5453)
      const v = fract(Math.sin(i * 78.233) * 12543.123)
      const ang = u * Math.PI * 2
      const rad = 0.3 + v * 0.8
      const lx = 100 + Math.cos(ang) * 34 * rad
      const ly = 74 + Math.sin(ang) * 34 * rad * 0.55 + 6
      const lr = 2.4 + v * 3.2
      const tint = v > 0.72 ? '#8fd07c' : v > 0.4 ? '#57b95a' : '#4caf50'
      leaves.push([lx, ly, lr, tint])
    }
    for (let i = 0; i < 6; i++) {
      const u = fract(Math.sin(i * 91.7) * 43758.5453)
      const v = fract(Math.sin(i * 51.3) * 43758.5453)
      const lx = 100 + (u - 0.5) * 70
      const ly = 62 - v * 26
      const lr = 2.2 + fract(Math.sin(i * 33.9) * 43758.5453) * 2
      leaves.push([lx, ly, lr, '#8fd07c'])
    }
  }
  return (
    <svg className="splash-tree-svg" viewBox="0 0 200 170" aria-hidden>
      {/* 地面 */}
      <ellipse cx="100" cy="150" rx="86" ry="12" fill="#2d2a26" opacity="0.9" />
      <ellipse cx="100" cy="147" rx="78" ry="8" fill="#3a362f" />
      {/* 种子（阶段 0） */}
      {!showSprout && (
        <g className="splash-seed">
          <ellipse cx="100" cy="146" rx="7" ry="9" fill="#7a4a2a" stroke="#5a3420" strokeWidth="1" />
          <path d="M 96 143 Q 100 147 104 143" fill="none" stroke="#5a3420" strokeWidth="1" opacity="0.7" />
        </g>
      )}
      {/* 根系：从茎底部向两侧舒展（根茎连贯） */}
      {showRoots && (
        <g className="splash-roots" stroke="#7a4a2a" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M 100 146 Q 88 140 80 148" />
          <path d="M 100 146 Q 112 140 121 147" />
          <path d="M 100 146 Q 94 152 90 158" />
          <path d="M 100 146 Q 106 152 110 157" />
        </g>
      )}
      {/* 茎 */}
      {showSprout && (
        <g className="splash-stem" stroke="#7a5a34" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M 100 146 Q 99 120 100 98" />
        </g>
      )}
      {/* 芽（阶段 1）：两片小叶 */}
      {showSprout && !showCrown && (
        <g className="splash-sprout">
          <path d="M 100 100 Q 88 90 84 80 Q 96 84 100 100 Z" fill="#6da05a" />
          <path d="M 100 100 Q 112 90 116 80 Q 104 84 100 100 Z" fill="#5d8f4c" />
        </g>
      )}
      {/* 密集叶冠（阶段 2+）：基底 + 22 片小叶 + 6 片亮叶（与专注树同风格） */}
      {showCrown && (
        <g className="splash-crown">
          <ellipse cx="100" cy="74" rx="34" ry="30" fill="#3e8e41" opacity="0.9" />
          {leaves.map(([lx, ly, lr, tint], i) => (
            <ellipse key={i} cx={lx.toFixed(1)} cy={ly.toFixed(1)} rx={lr.toFixed(1)} ry={(lr * 0.85).toFixed(1)} fill={tint} opacity="0.95" />
          ))}
          {grown && (
            <>
              <ellipse cx="84" cy="58" rx="6" ry="4" fill="#8fd07c" opacity="0.8" />
              <ellipse cx="112" cy="62" rx="5" ry="3.5" fill="#8fd07c" opacity="0.7" />
            </>
          )}
        </g>
      )}
    </svg>
  )
}

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
        {/* 动画场景：种子 → 芽 → 圆冠树 */}
        <div className={`splash-stage stage-${stage}`}>
          <GrowthTree stage={stage} />
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
