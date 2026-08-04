// 天空 V4：场景化配色 + 太阳光晕 + 粒子效果（萤火虫/落叶/樱花/雨/雪）
// 场景调色板来自 sceneService（内置预置 + AI 共创）
import type { CustomScene, Weather } from '../types'

interface SkyProps {
  weather: Weather
  /** 场景（配色 + 粒子） */
  scene?: CustomScene
}

/** 确定性伪随机（基于索引，保证渲染稳定不闪烁） */
function seeded(i: number, seed: number): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** 十六进制颜色混合（用于山丘随天色） */
function blendHex(c1: string, c2: string, ratio: number): string {
  const parse = (c: string) => {
    const h = c.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const [r1, g1, b1] = parse(c1)
  const [r2, g2, b2] = parse(c2)
  const r = Math.round(r1 + (r2 - r1) * ratio)
  const g = Math.round(g1 + (g2 - g1) * ratio)
  const b = Math.round(b1 + (b2 - b1) * ratio)
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// 前景雨滴（大、快、斜）
const RAIN_FORE = Array.from({ length: 34 }, (_, i) => ({
  x: seeded(i, 1) * 1000,
  y: seeded(i, 2) * 580,
  len: 14 + seeded(i, 3) * 10,
  dur: 0.55 + seeded(i, 4) * 0.3,
  delay: seeded(i, 5) * 1.5, // 错开，避免同步
  op: 0.5 + seeded(i, 6) * 0.4,
}))
// 背景雨滴（小、慢、淡）
const RAIN_BACK = Array.from({ length: 46 }, (_, i) => ({
  x: seeded(i, 11) * 1000,
  y: seeded(i, 12) * 580,
  len: 7 + seeded(i, 13) * 5,
  dur: 0.85 + seeded(i, 14) * 0.4,
  delay: seeded(i, 15) * 1.5,
  op: 0.25 + seeded(i, 16) * 0.3,
}))
// 前景雪花（大、慢、明显飘摆）
const SNOW_FORE = Array.from({ length: 26 }, (_, i) => ({
  x: seeded(i, 21) * 1000,
  y: seeded(i, 22) * 580,
  r: 2.6 + seeded(i, 23) * 2.4,
  dur: 3.2 + seeded(i, 24) * 2.5,
  delay: seeded(i, 25) * 4,
  drift: (seeded(i, 26) - 0.5) * 60,
  op: 0.75 + seeded(i, 27) * 0.25,
}))
// 背景雪花（小、慢、淡）
const SNOW_BACK = Array.from({ length: 34 }, (_, i) => ({
  x: seeded(i, 31) * 1000,
  y: seeded(i, 32) * 580,
  r: 1.2 + seeded(i, 33) * 1.4,
  dur: 5.5 + seeded(i, 34) * 3.5,
  delay: seeded(i, 35) * 4,
  drift: (seeded(i, 36) - 0.5) * 40,
  op: 0.35 + seeded(i, 37) * 0.3,
}))

export function Sky({ weather, scene }: SkyProps) {
  // 场景化配色：优先场景调色板，天气覆盖天空明暗
  const palette = scene
  const skyStyle = palette
    ? {
        background: `linear-gradient(180deg, ${palette.skyTop} 0%, ${palette.skyBottom} 100%)`,
      }
    : undefined
  const cloudFill = palette
    ? palette.cloudColor
    : weather === 'snowy'
      ? '#dbe4ec'
      : weather === 'rainy'
        ? '#b9cad6'
        : '#ffffff'

  return (
    <div className={`sky sky-${weather}`} style={skyStyle}>
      <svg className="sky-svg" viewBox="0 0 1000 580" preserveAspectRatio="xMidYMin slice" aria-hidden>
        <defs>
          {/* 太阳柔和光晕渐变 */}
          <radialGradient id="sunHalo">
            <stop offset="0%" stopColor="#ffec9e" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#ffd54f" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffd54f" stopOpacity="0" />
          </radialGradient>
          {/* 云朵柔和阴影 */}
          <radialGradient id="cloudShade">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#c9dce8" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        {/* 太阳（晴天且场景允许时显示） */}
        {weather === 'sunny' && (!palette || palette.showSun) && (
          <g className="sun">
            <circle cx="140" cy="95" r="34" fill="#ffd54f" />
            <circle cx="140" cy="95" r="34" fill="url(#sunHalo)" />
            <circle cx="140" cy="95" r="14" fill="#fff3b8" />
          </g>
        )}
        {/* 云朵：场景色或天气色 */}
        <g
          className="cloud cloud-1"
          fill={cloudFill}
          opacity="0.95"
        >
          <ellipse cx="180" cy="120" rx="70" ry="32" />
          <ellipse cx="225" cy="105" rx="48" ry="26" />
          <ellipse cx="140" cy="112" rx="38" ry="22" />
        </g>
        <g
          className="cloud cloud-2"
          fill={palette ? palette.cloudColor : weather === 'snowy' ? '#ccd8e2' : weather === 'rainy' ? '#a9bccb' : '#ffffff'}
          opacity="0.9"
        >
          <ellipse cx="720" cy="200" rx="90" ry="38" />
          <ellipse cx="780" cy="180" rx="55" ry="28" />
          <ellipse cx="665" cy="188" rx="45" ry="24" />
        </g>
        <g
          className="cloud cloud-3"
          fill={palette ? palette.cloudColor : weather === 'snowy' ? '#e2e9f0' : weather === 'rainy' ? '#c6d4de' : '#ffffff'}
          opacity="0.85"
        >
          <ellipse cx="420" cy="70" rx="55" ry="24" />
          <ellipse cx="455" cy="58" rx="36" ry="18" />
          <ellipse cx="388" cy="64" rx="28" ry="15" />
        </g>
        {/* 晴天：远处小鸟 */}
        {weather === 'sunny' && (!palette || palette.showSun) && (
          <g className="birds" stroke="#5a6b7a" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5">
            <path d="M 300 150 q 7 -9 14 0 q 7 -9 14 0" />
            <path d="M 345 165 q 6 -8 12 0 q 6 -8 12 0" />
          </g>
        )}

        {/* 远处山丘剪影（随场景天色） */}
        <g
          className="hills"
          fill={palette ? blendHex(palette.skyTop, palette.skyBottom, 0.55) : weather === 'snowy' ? '#8fa8b8' : weather === 'rainy' ? '#7a95a8' : '#9fcfa0'}
          opacity="0.35"
        >
          <path d="M 0 580 L 0 500 Q 90 468 180 496 Q 270 524 360 492 Q 450 460 540 490 Q 630 520 720 488 Q 810 456 900 486 Q 950 500 1000 484 L 1000 580 Z" />
          <path d="M 0 580 L 0 528 Q 120 500 240 524 Q 360 548 480 520 Q 600 492 720 518 Q 840 544 1000 516 L 1000 580 Z" opacity="0.6" />
        </g>

        {/* 场景粒子：萤火虫（夜晚场景） */}
        {palette?.particles === 'fireflies' && (
          <g className="fireflies" fill="#ffe98a">
            {Array.from({ length: 14 }, (_, i) => (
              <circle
                key={`ff-${i}`}
                className="firefly"
                cx={80 + seeded(i, 41) * 840}
                cy={60 + seeded(i, 42) * 420}
                r={1.6 + seeded(i, 43) * 1.8}
                style={{
                  animationDuration: `${2.5 + seeded(i, 44) * 3}s`,
                  animationDelay: `-${seeded(i, 45) * 4}s`,
                }}
              />
            ))}
          </g>
        )}
        {/* 场景粒子：落叶（秋日场景） */}
        {palette?.particles === 'leaves' && (
          <g className="leaves" fill="#d96c3f">
            {Array.from({ length: 16 }, (_, i) => (
              <path
                key={`lf-${i}`}
                className="leaf-drop"
                d={`M 0 0 q 4 -5 8 0 q -2 4 -8 0 M 8 0 q 4 2 6 0`}
                transform={`translate(${seeded(i, 51) * 1000} ${seeded(i, 52) * 580}) scale(${0.8 + seeded(i, 53)})`}
                style={{
                  animationDuration: `${5 + seeded(i, 54) * 4}s`,
                  animationDelay: `-${seeded(i, 55) * 5}s`,
                }}
              />
            ))}
          </g>
        )}
        {/* 场景粒子：樱花（春日场景） */}
        {palette?.particles === 'sakura' && (
          <g className="sakura" fill="#f8bcd0">
            {Array.from({ length: 18 }, (_, i) => (
              <circle
                key={`sk-${i}`}
                className="sakura-petal"
                cx={seeded(i, 61) * 1000}
                cy={seeded(i, 62) * 580}
                r={2 + seeded(i, 63) * 2}
                style={{
                  animationDuration: `${4 + seeded(i, 64) * 3}s`,
                  animationDelay: `-${seeded(i, 65) * 4}s`,
                }}
              />
            ))}
          </g>
        )}

        {/* ===== 雨天：双层雨幕（背景淡远 + 前景清晰） ===== */}
        {weather === 'rainy' && (
          <>
            <g className="rain-layer rain-back" stroke="#a8c6e0" strokeWidth="1.2" strokeLinecap="round">
              {RAIN_BACK.map((d, i) => (
                <line
                  key={`rb-${i}`}
                  className="rain-drop"
                  x1={d.x} y1={d.y}
                  x2={d.x - 7} y2={d.y + d.len}
                  opacity={d.op}
                  style={{
                    animationDuration: `${d.dur}s`,
                    animationDelay: `-${d.delay}s`,
                  }}
                />
              ))}
            </g>
            <g className="rain-layer rain-fore" stroke="#7fa8cc" strokeWidth="1.8" strokeLinecap="round">
              {RAIN_FORE.map((d, i) => (
                <line
                  key={`rf-${i}`}
                  className="rain-drop"
                  x1={d.x} y1={d.y}
                  x2={d.x - 9} y2={d.y + d.len}
                  opacity={d.op}
                  style={{
                    animationDuration: `${d.dur}s`,
                    animationDelay: `-${d.delay}s`,
                  }}
                />
              ))}
            </g>
          </>
        )}

        {/* ===== 雪天：双层雪（背景细雪 + 前景大雪花飘摆） ===== */}
        {weather === 'snowy' && (
          <>
            <g className="snow-layer snow-back" fill="#eaf2f8">
              {SNOW_BACK.map((d, i) => (
                <circle
                  key={`sb-${i}`}
                  className="snow-flake"
                  cx={d.x} cy={d.y} r={d.r}
                  opacity={d.op}
                  style={{
                    animationDuration: `${d.dur}s`,
                    animationDelay: `-${d.delay}s`,
                    ['--drift' as string]: `${d.drift}px`,
                  }}
                />
              ))}
            </g>
            <g className="snow-layer snow-fore" fill="#ffffff">
              {SNOW_FORE.map((d, i) => (
                <circle
                  key={`sf-${i}`}
                  className="snow-flake"
                  cx={d.x} cy={d.y} r={d.r}
                  opacity={d.op}
                  style={{
                    animationDuration: `${d.dur}s`,
                    animationDelay: `-${d.delay}s`,
                    ['--drift' as string]: `${d.drift}px`,
                  }}
                />
              ))}
            </g>
          </>
        )}
      </svg>
    </div>
  )
}
