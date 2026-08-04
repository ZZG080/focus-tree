// 地面 V5：场景化配色（草/土色来自场景调色板）+ 积雪消融 + 成熟期草地变深（树荫反馈）
// 结构：上 1/3 绿色草地，下 2/3 棕色泥土（种子落入棕色区域）
import { memo } from 'react'
import type { CustomScene } from '../types'

interface GroundProps {
  /** 积雪程度 0~1（0 无雪，1 完全覆盖草地），支持消融过渡 */
  snowLevel: number
  /** 是否下雪中（控制天空雪花密度视觉） */
  isSnowy: boolean
  /** 是否下雨中（控制地面涟漪） */
  isRainy?: boolean
  /** 场景（配色） */
  scene?: CustomScene
  /** 树是否进入成熟期（草地变深，象征树荫环境反馈） */
  mature?: boolean
}

export const Ground = memo(function Ground({ snowLevel, isSnowy, isRainy = false, scene, mature = false }: GroundProps) {
  // 积雪高度：随 snowLevel 从草地顶部向下覆盖整个草地（上 1/3）
  const snowCoverY = 40 * (1 - Math.min(1, snowLevel))
  const snowOpacity = 0.4 + snowLevel * 0.6
  // 场景配色（回退默认）；成熟期草地变深（树荫）
  const grassColor = scene?.grass ?? '#6db95c'
  const matureGrass = mature ? '#4a8a3e' : grassColor
  const dirtColor = scene?.dirt ?? '#a9713d'

  return (
    <div className={`ground ${isSnowy ? 'snowy' : ''}`}>
      <svg className="ground-svg" viewBox="0 0 1000 120" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          {/* 泥土渐变 */}
          <linearGradient id="dirtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={dirtColor} />
            <stop offset="55%" stopColor={dirtColor} />
            <stop offset="100%" stopColor={dirtColor} />
          </linearGradient>
          {/* 草地渐变 */}
          <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={grassColor} />
            <stop offset="100%" stopColor={grassColor} />
          </linearGradient>
          {/* 积雪渐变 */}
          <linearGradient id="snowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8eef2" />
          </linearGradient>
        </defs>

        {/* 棕色泥土（下 2/3，带渐变与起伏） */}
        <path
          className="dirt"
          d="M 0 40 L 0 120 L 1000 120 L 1000 40 C 930 32, 860 46, 780 38 C 700 30, 630 46, 550 40 C 470 34, 400 48, 320 40 C 240 32, 160 46, 80 40 C 55 38, 28 42, 0 40 Z"
          fill="url(#dirtGrad)"
        />
        {/* 泥土纹理：深浅颗粒 + 小石子 */}
        <g fill="#8a5a2c" opacity="0.45">
          <circle cx="120" cy="82" r="3" />
          <circle cx="260" cy="72" r="2.5" />
          <circle cx="400" cy="92" r="3.5" />
          <circle cx="540" cy="74" r="2.5" />
          <circle cx="680" cy="86" r="3" />
          <circle cx="820" cy="70" r="2" />
          <circle cx="940" cy="90" r="2.5" />
          <circle cx="200" cy="106" r="2" />
          <circle cx="500" cy="108" r="2.5" />
          <circle cx="760" cy="104" r="2" />
        </g>
        <g fill="#c08a52" opacity="0.35">
          <circle cx="90" cy="65" r="2" />
          <circle cx="330" cy="60" r="2.5" />
          <circle cx="580" cy="62" r="2" />
          <circle cx="720" cy="95" r="3" />
          <circle cx="900" cy="75" r="2" />
        </g>
        {/* 小石子（手绘感轮廓） */}
        <g fill="none" stroke="#7a5230" strokeWidth="1.5" opacity="0.4">
          <ellipse cx="350" cy="60" rx="7" ry="4" />
          <ellipse cx="620" cy="55" rx="5" ry="3" />
          <ellipse cx="880" cy="62" rx="6" ry="3.5" />
          <ellipse cx="150" cy="95" rx="6" ry="3.5" />
        </g>

        {/* 绿色草地（上 1/3，起伏不平，带渐变）——成熟期变深（树荫） */}
        <path
          className="grass"
          d="M 0 40 L 0 8 C 40 -2, 80 14, 130 6 C 180 -2, 230 14, 280 6 C 330 -2, 380 12, 430 5 C 480 -2, 530 12, 580 6 C 630 0, 680 12, 730 6 C 780 0, 830 12, 880 6 C 930 0, 970 12, 1000 6 L 1000 40 Z"
          fill={matureGrass}
          style={{ transition: 'fill 1.5s ease' }}
        />
        {/* 草地暗部（边缘阴影，增加立体感）——成熟期同步加深 */}
        <path
        className="grass-shade"
        d="M 0 40 L 0 28 C 60 22, 130 30, 200 26 C 280 22, 360 30, 440 26 C 520 22, 600 30, 680 26 C 760 22, 850 30, 1000 26 L 1000 40 Z"
        fill={mature ? '#3a7232' : '#4a8a3e'}
        opacity="0.35"
        style={{ transition: 'fill 1.5s ease' }}
        />
        {/* 草叶（两簇不同深浅） */}
        <g className="grass-blades" stroke="#5aa04a" strokeWidth="0.8">
          <g fill="#8fd07c">
            <path d="M 60 30 q -5 -16 -3 -24 q 7 7 7 18 z" />
            <path d="M 130 26 q 4 -14 7 -20 q 6 6 5 16 z" />
            <path d="M 200 30 q -4 -13 -2 -19 q 6 5 5 14 z" />
            <path d="M 280 28 q 4 -12 6 -17 q 5 5 4 13 z" />
            <path d="M 350 30 q -4 -14 -2 -20 q 6 6 5 15 z" />
            <path d="M 430 28 q 3 -11 5 -15 q 5 4 4 11 z" />
            <path d="M 520 30 q -5 -15 -3 -22 q 7 7 6 17 z" />
            <path d="M 600 26 q 4 -13 6 -18 q 6 6 5 14 z" />
            <path d="M 680 30 q -3 -12 -1 -18 q 5 5 4 13 z" />
            <path d="M 760 28 q 4 -14 6 -19 q 5 6 4 14 z" />
            <path d="M 840 30 q -4 -13 -2 -19 q 6 5 5 14 z" />
            <path d="M 920 28 q 3 -11 5 -15 q 5 4 4 11 z" />
          </g>
          <g fill="#6ab85a" opacity="0.8">
            <path d="M 95 28 q 3 -12 5 -17 q 5 5 4 13 z" />
            <path d="M 170 30 q -4 -13 -2 -18 q 6 5 5 13 z" />
            <path d="M 245 26 q 4 -12 6 -16 q 5 5 4 12 z" />
            <path d="M 315 30 q -3 -12 -1 -17 q 5 5 4 12 z" />
            <path d="M 470 28 q 3 -11 5 -15 q 5 4 4 11 z" />
            <path d="M 555 30 q -4 -14 -2 -20 q 6 6 5 15 z" />
            <path d="M 640 26 q 3 -12 5 -16 q 5 5 4 12 z" />
            <path d="M 720 30 q -3 -13 -1 -18 q 5 5 4 13 z" />
            <path d="M 800 28 q 4 -12 6 -16 q 5 5 4 12 z" />
            <path d="M 880 30 q -4 -13 -2 -18 q 6 5 5 13 z" />
            <path d="M 960 28 q 3 -11 5 -15 q 5 4 4 11 z" />
          </g>
        </g>
        {/* 草地与泥土交界线（柔和过渡） */}
        <path
          d="M 0 40 C 60 34, 130 42, 200 38 C 280 34, 360 42, 440 38 C 520 34, 600 42, 680 38 C 760 34, 850 42, 1000 38"
          fill="none"
          stroke="#4e8f40"
          strokeWidth="2.5"
          opacity="0.4"
        />

        {/* 积雪层：覆盖草地，随 snowLevel 变厚（支持消融），逐渐吞没绿色 */}
        {snowLevel > 0.005 && (
          <g className="snow-pile" style={{ opacity: snowOpacity }}>
            <path
              d={`M 0 ${snowCoverY} L 0 ${3 + (1 - snowLevel) * 4} C 50 ${-2 + (1 - snowLevel) * 3}, 120 ${9 + (1 - snowLevel) * 2}, 200 ${3 + (1 - snowLevel) * 4} C 290 ${-1 + (1 - snowLevel) * 3}, 380 ${8 + (1 - snowLevel) * 2}, 470 ${3 + (1 - snowLevel) * 4} C 560 ${-1 + (1 - snowLevel) * 3}, 650 ${9 + (1 - snowLevel) * 2}, 740 ${3 + (1 - snowLevel) * 4} C 830 ${-1 + (1 - snowLevel) * 3}, 920 ${9 + (1 - snowLevel) * 2}, 1000 ${3 + (1 - snowLevel) * 4} L 1000 ${snowCoverY} C 900 ${snowCoverY + 5}, 780 ${snowCoverY - 3}, 660 ${snowCoverY + 5} C 540 ${snowCoverY + 3}, 420 ${snowCoverY - 3}, 300 ${snowCoverY + 5} C 180 ${snowCoverY + 3}, 80 ${snowCoverY - 2}, 0 ${snowCoverY + 4} Z`}
              fill="url(#snowGrad)"
            />
            {/* 雪面高光 */}
            <path
              d={`M 40 ${snowCoverY + 6} Q 200 ${snowCoverY - 6} 400 ${snowCoverY + 4} Q 600 ${snowCoverY - 4} 800 ${snowCoverY + 5} Q 900 ${snowCoverY} 980 ${snowCoverY + 6}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              opacity="0.7"
            />
          </g>
        )}
        {/* 雪天：地面零星雪点（低雪量时也有氛围） */}
        {snowLevel > 0.15 && (
          <g className="snow-dots" fill="#ffffff" opacity={0.5 + snowLevel * 0.4}>
            <circle cx="80" cy={32 - snowLevel * 20} r="3" />
            <circle cx="230" cy={30 - snowLevel * 18} r="2.5" />
            <circle cx="390" cy={33 - snowLevel * 19} r="3" />
            <circle cx="560" cy={29 - snowLevel * 17} r="2" />
            <circle cx="720" cy={32 - snowLevel * 20} r="3" />
            <circle cx="880" cy={31 - snowLevel * 18} r="2.5" />
          </g>
        )}
        {/* 雨天：雨落地涟漪（泥土表面的扩散圆环，音画同步感） */}
        {isRainy && (
          <g className="ripples" stroke="#7fa8cc" fill="none" strokeWidth="1.2" opacity="0.5">
            {[
              { cx: 120, cy: 72, delay: 0 },
              { cx: 300, cy: 88, delay: 0.5 },
              { cx: 470, cy: 66, delay: 1.0 },
              { cx: 640, cy: 92, delay: 0.3 },
              { cx: 810, cy: 70, delay: 0.8 },
              { cx: 930, cy: 85, delay: 1.2 },
            ].map((r, i) => (
              <ellipse
                key={`ripple-${i}`}
                className="ripple"
                cx={r.cx}
                cy={r.cy}
                rx="10"
                ry="3.5"
                style={{ animationDelay: `${r.delay}s` }}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  )
})
