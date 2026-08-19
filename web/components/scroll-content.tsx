'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { READER_SCROLL_ID } from '@/lib/constants'

export function ScrollContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [showTop, setShowTop] = useState(false)
  const pathname = usePathname()

  // The page scrolls inside this element rather than the window, so the
  // router's own scroll restoration never touches it — without this you open
  // the next day's digest already halfway down it.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = 0
    setProgress(0)
    setShowTop(false)
  }, [pathname])

  function onScroll() {
    const el = ref.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const scrollable = scrollHeight - clientHeight
    setProgress(scrollable > 0 ? (scrollTop / scrollable) * 100 : 0)
    setShowTop(scrollTop > 600)
  }

  return (
    <div
      id={READER_SCROLL_ID}
      ref={ref}
      className="reader-scroll flex-1 overflow-y-auto"
      onScroll={onScroll}
    >
      {/* How far through the day's reading you are. */}
      <div className="sticky top-0 z-10 h-px" aria-hidden>
        <div className="reading-progress" style={{ width: `${progress}%` }} />
      </div>

      {children}

      <button
        onClick={() =>
          ref.current?.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
              .matches
              ? 'auto'
              : 'smooth',
          })
        }
        className="back-to-top"
        data-visible={showTop || undefined}
        // Invisible controls stay out of the tab order.
        tabIndex={showTop ? 0 : -1}
        aria-hidden={!showTop}
        aria-label="Обратно към началото"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 11V3M3 7l4-4 4 4" />
        </svg>
      </button>
    </div>
  )
}
