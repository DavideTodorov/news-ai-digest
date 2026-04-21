'use client'

import { useRef, useState } from 'react'

export function ScrollContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [showTop, setShowTop] = useState(false)

  function onScroll() {
    const el = ref.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const scrollable = scrollHeight - clientHeight
    setProgress(scrollable > 0 ? (scrollTop / scrollable) * 100 : 0)
    setShowTop(scrollTop > 300)
  }

  return (
    <div ref={ref} className="flex-1 overflow-y-auto" onScroll={onScroll}>
      {/* Reading progress bar */}
      <div className="sticky top-0 z-10 h-[2px]">
        <div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--accent), var(--source-investor))',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {children}

      {/* Back to top */}
      <button
        onClick={() => ref.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow)',
          opacity: showTop ? 1 : 0,
          pointerEvents: showTop ? 'auto' : 'none',
        }}
        aria-label="Back to top"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 11V3M3 7l4-4 4 4" />
        </svg>
      </button>
    </div>
  )
}
