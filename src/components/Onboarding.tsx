// 新手引导：首次启动时 3 步引导（选树种 → 选天气 → 开始专注）
import { useState } from 'react'

interface OnboardingProps {
  onFinish: () => void
}

const STEPS = [
  {
    icon: '🌳',
    title: '选择你的树种',
    desc: '从橡树开始，完成专注次数或累计时长，即可解锁樱花、枫树、松树、银杏！',
  },
  {
    icon: '🌦️',
    title: '选择天气与环境',
    desc: '晴天、雨天（生长加速）、雪天（积雪渐厚）。还可以联动你所在城市的真实天气。',
  },
  {
    icon: '⏱️',
    title: '开始专注，种下种子',
    desc: '种子从天而降，随时间慢慢长成大树。专注结束后，会收到 AI 的鼓励语。',
  },
  {
    icon: '📖',
    title: '见证你的森林',
    desc: '每次专注都在积累你的森林。在「我的森林」查看记录、图鉴和 AI 周报。',
  },
]

export function Onboarding({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      onFinish()
    }
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
          ))}
        </div>
        <div className="onboarding-icon">{current.icon}</div>
        <h2>{current.title}</h2>
        <p>{current.desc}</p>
        <div className="onboarding-actions">
          {step > 0 && (
            <button className="ghost-btn" onClick={() => setStep(step - 1)}>上一步</button>
          )}
          <button className="start-btn" onClick={next}>
            {step < STEPS.length - 1 ? '下一步 →' : '开始种树 🌱'}
          </button>
        </div>
        <button className="onboarding-skip" onClick={onFinish}>跳过引导</button>
      </div>
    </div>
  )
}
