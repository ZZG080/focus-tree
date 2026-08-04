// 防抖工具：窗口 resize 等高频事件延迟处理，避免频繁重绘
import { useEffect, useRef, useState } from 'react'

/** 通用防抖：fn 在最后一次调用后 delay 毫秒执行 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 200
): (...args: A) => void {
  const timerRef = useRef<number | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  return (...args: A) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      fnRef.current(...args)
    }, delay)
  }
}

/** 防抖的窗口尺寸（resize 停止 200ms 后才更新，避免拖动窗口时频繁重绘） */
export function useDebouncedWindowSize(delay = 200): { width: number; height: number } {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  // 用 ref 保存最新尺寸，避免闭包过期
  const sizeRef = useRef(size)
  sizeRef.current = size

  // 关键：防抖回调必须在组件顶层创建（useDebouncedCallback 内部使用 useRef，
  // 在 useEffect 回调里调用含 hooks 的函数会触发 React 开发构建的
  // "Invalid hook call"——生产构建不检查所以线上正常，dev 模式必崩）
  const handleResize = useDebouncedCallback(() => {
    setSize({ width: window.innerWidth, height: window.innerHeight })
  }, delay)

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, handleResize])

  return size
}
