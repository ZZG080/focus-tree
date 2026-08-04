// 应用入口 V7：多界面导航 + 启动页 + 新手引导 + 设备模式切换（网页/手机）
// 视图：设置(专注) / 专注 / 森林 / 周报 / 场景工作室
import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from './services/storageService'
import { SetupView } from './components/SetupView'
import { FocusView } from './components/FocusView'
import { HistoryView } from './components/HistoryView'
import { ReportView } from './components/ReportView'
import { SceneStudio } from './components/SceneStudioView'
import { SplashScreen } from './components/SplashScreen'
import { Onboarding } from './components/Onboarding'

type View = 'setup' | 'focus' | 'history' | 'report' | 'scene'
type DeviceMode = 'auto' | 'desktop' | 'mobile'

export default function App() {
  const [view, setView] = useState<View>('setup')
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [phase, setPhase] = useState<'splash' | 'onboarding' | 'main'>('splash')
  const [navVisible, setNavVisible] = useState(false)
  // 设备模式：auto 自动检测屏幕宽度 / desktop 强制桌面 / mobile 强制手机框
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('auto')

  useEffect(() => {
    if (phase === 'main' && !getSettings().onboardingDone) {
      saveSettings({ onboardingDone: true })
    }
    setNavVisible(phase === 'main')
  }, [phase])

  const handleStart = (minutes: number) => {
    setFocusMinutes(minutes)
    setView('focus')
  }

  // 切换设备模式
  const toggleDeviceMode = () => {
    setDeviceMode((prev) => (prev === 'auto' ? 'mobile' : prev === 'mobile' ? 'desktop' : 'auto'))
  }

  // 设备模式决定容器 class
  const deviceClass =
    deviceMode === 'mobile' ? 'device-mobile' : deviceMode === 'desktop' ? 'device-desktop' : 'device-auto'

  return (
    <div className="app">
      {/* 设备模式切换按钮（始终可见，右下角浮动） */}
      {phase === 'main' && view !== 'focus' && (
        <button
          className="device-toggle-btn"
          onClick={toggleDeviceMode}
          title={deviceMode === 'auto' ? '当前：自动（点击切手机）' : deviceMode === 'mobile' ? '当前：手机（点击切桌面）' : '当前：桌面（点击切自动）'}
        >
          {deviceMode === 'auto' ? '🖥️' : deviceMode === 'mobile' ? '📱' : '💻'}
        </button>
      )}

      {/* 设备外框（手机模式时显示手机壳） */}
      <div className={`device-frame ${deviceClass}`}>
        <div className="device-screen">
          {phase === 'splash' && <SplashScreen onDone={() => setPhase(getSettings().onboardingDone ? 'main' : 'onboarding')} />}
          {phase === 'onboarding' && <Onboarding onFinish={() => setPhase('main')} />}

          {phase === 'main' && (
            <>
              <div className="main-view">
                {view === 'setup' && (
                  <SetupView onStart={handleStart} onShowHistory={() => setView('history')} />
                )}
                {view === 'focus' && (
                  <FocusView initialMinutes={focusMinutes} onExit={() => setView('setup')} />
                )}
                {view === 'history' && <HistoryView onBack={() => setView('setup')} />}
                {view === 'report' && <ReportView onBack={() => setView('setup')} />}
                {view === 'scene' && (
                  <SceneStudio onBack={() => setView('setup')} onApplied={() => setView('setup')} />
                )}
              </div>

              {/* 底部导航（专注时隐藏，保持沉浸） */}
              {navVisible && view !== 'focus' && (
                <nav className="bottom-nav">
                  <button className={`nav-item ${view === 'setup' ? 'active' : ''}`} onClick={() => setView('setup')}>
                    <span className="nav-icon">🌱</span>
                    <span className="nav-label">专注</span>
                  </button>
                  <button className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
                    <span className="nav-icon">📖</span>
                    <span className="nav-label">森林</span>
                  </button>
                  <button className={`nav-item ${view === 'report' ? 'active' : ''}`} onClick={() => setView('report')}>
                    <span className="nav-icon">📈</span>
                    <span className="nav-label">周报</span>
                  </button>
                  <button className={`nav-item ${view === 'scene' ? 'active' : ''}`} onClick={() => setView('scene')}>
                    <span className="nav-icon">🎨</span>
                    <span className="nav-label">场景</span>
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
