// 应用入口 V7：桌面版侧边栏布局 + 移动版底部导航（自适应切换）
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
import { ErrorBoundary } from './components/ErrorBoundary'

type View = 'setup' | 'focus' | 'history' | 'report' | 'scene'

const NAV_ITEMS: Array<{ view: View; icon: string; label: string }> = [
  { view: 'setup', icon: '🌱', label: '专注' },
  { view: 'history', icon: '📖', label: '森林' },
  { view: 'report', icon: '📈', label: '周报' },
  { view: 'scene', icon: '🎨', label: '场景' },
]

export default function App() {
  const [view, setView] = useState<View>('setup')
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [phase, setPhase] = useState<'splash' | 'onboarding' | 'main'>('splash')

  useEffect(() => {
    if (phase === 'main' && !getSettings().onboardingDone) {
      saveSettings({ onboardingDone: true })
    }
  }, [phase])

  const handleStart = (minutes: number) => {
    setFocusMinutes(minutes)
    setView('focus')
  }

  // 专注时全屏沉浸（隐藏侧边栏与导航）
  const immersive = view === 'focus'

  return (
    <div className={`app ${immersive ? 'app-immersive' : 'app-shell'}`}>
      {phase === 'splash' && <SplashScreen onDone={() => setPhase(getSettings().onboardingDone ? 'main' : 'onboarding')} />}
      {phase === 'onboarding' && <Onboarding onFinish={() => setPhase('main')} />}

      {phase === 'main' && (
        <>
          {/* 主内容区 */}
          <main className={`main-content ${immersive ? 'main-immersive' : ''}`}>
            {immersive ? (
              <ErrorBoundary
                fallback={
                  <div className="result-view">
                    <div className="result-card">
                      <h2>😵 场景出错了</h2>
                      <p className="result-msg" role="alert">
                        树场景渲染遇到问题，但你的专注数据没有丢失。可安全退出后重试。
                      </p>
                      <div className="result-actions">
                        <button className="start-btn" onClick={() => setView('setup')}>🌱 返回设置</button>
                      </div>
                    </div>
                  </div>
                }
              >
                <FocusView initialMinutes={focusMinutes} onExit={() => setView('setup')} />
              </ErrorBoundary>
            ) : (
              <div className="layout">
                {/* 桌面侧边栏（移动端自动隐藏） */}
                <aside className="sidebar">
                  <div className="sidebar-brand">
                    <span className="sidebar-logo">🌳</span>
                    <div>
                      <div className="sidebar-title">Focus Tree</div>
                      <div className="sidebar-sub">专注种树</div>
                    </div>
                  </div>
                  <nav className="sidebar-nav">
                    {NAV_ITEMS.map((item) => (
                      <button
                        key={item.view}
                        className={`sidebar-item ${view === item.view ? 'active' : ''}`}
                        onClick={() => setView(item.view)}
                      >
                        <span className="sidebar-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </nav>
                  <div className="sidebar-footer">
                    <button className="sidebar-item" onClick={() => setView('setup')} title="返回设置">
                      <span className="sidebar-icon">⚙️</span>
                      <span>设置</span>
                    </button>
                  </div>
                </aside>

                {/* 内容列 */}
                <div className="layout-main">
                  {view === 'setup' && (
                    <SetupView
                      onStart={handleStart}
                      onShowHistory={() => setView('history')}
                    />
                  )}
                  {view === 'history' && <HistoryView onBack={() => setView('setup')} />}
                  {view === 'report' && <ReportView onBack={() => setView('setup')} />}
                  {view === 'scene' && (
                    <SceneStudio onBack={() => setView('setup')} onApplied={() => setView('setup')} />
                  )}
                </div>
              </div>
            )}
          </main>

          {/* 移动端底部导航（桌面自动隐藏） */}
          {!immersive && (
            <nav className="bottom-nav">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.view}
                  className={`nav-item ${view === item.view ? 'active' : ''}`}
                  onClick={() => setView(item.view)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  )
}
