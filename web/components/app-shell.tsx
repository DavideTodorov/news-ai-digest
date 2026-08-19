'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'

const COLLAPSE_KEY = 'digest:archive-collapsed'

type Props = {
  sidebar: React.ReactNode
  /** The colour of the source being read — the chrome takes it on. */
  accent: string
  children: React.ReactNode
}

export function AppShell({ sidebar, accent, children }: Props) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [animate, setAnimate] = useState(false)
  const isCompact = useIsCompact()
  const pathname = usePathname()
  const openerRef = useRef<HTMLButtonElement>(null)
  const revealRef = useRef<HTMLButtonElement>(null)
  const collapseRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Picking a date is the whole point of the drawer, so close it on arrival.
  useEffect(() => setOpen(false), [pathname])

  // Whether you want the archive beside you is a standing preference, not a
  // per-page one. Restore it first, then let the width animate.
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    setAnimate(true)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        openerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function toggleCollapsed(next: boolean) {
    setCollapsed(next)
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
    // Follow the control that replaces the one being dismissed, so the
    // keyboard doesn't get stranded on an element that just went away.
    requestAnimationFrame(() =>
      (next ? revealRef : collapseRef).current?.focus()
    )
  }

  // Out of sight is out of reach for the keyboard too — off-screen on a phone,
  // clipped to zero width on a desktop.
  const hidden = isCompact ? !open : collapsed

  return (
    <div className="flex h-full overflow-hidden" style={{ '--accent': accent } as React.CSSProperties}>
      {open && (
        <div className="drawer-scrim md:hidden" onClick={() => setOpen(false)} />
      )}

      <div
        ref={drawerRef}
        className={`drawer ${open ? 'is-open' : ''}`}
        data-collapsed={(!isCompact && collapsed) || undefined}
        data-animate={animate || undefined}
        inert={hidden}
        aria-label="Архив"
      >
        <button
          className="ghost drawer-close md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Затвори менюто"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>

        <button
          ref={collapseRef}
          className="ghost drawer-collapse"
          onClick={() => toggleCollapsed(true)}
          aria-label="Скрий архива"
          aria-expanded
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 4L5.5 8l4 4" />
            <path d="M2.5 3v10" />
          </svg>
        </button>

        {sidebar}
      </div>

      <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">
        <button
          ref={revealRef}
          className="ghost sidebar-reveal"
          onClick={() => toggleCollapsed(false)}
          data-visible={collapsed || undefined}
          tabIndex={collapsed ? 0 : -1}
          aria-hidden={!collapsed}
          aria-label="Покажи архива"
          aria-expanded={false}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 4l4 4-4 4" />
            <path d="M2.5 3v10" />
          </svg>
        </button>

        <div className="mobile-bar md:hidden">
          <div className="flex items-center gap-2.5">
            <button
              ref={openerRef}
              className="ghost p-1.5 rounded-lg"
              onClick={() => setOpen(true)}
              aria-label="Отвори архива"
              aria-expanded={open}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" />
              </svg>
            </button>
            <span className="mobile-bar-title">News Digest</span>
          </div>
          <ThemeToggle />
        </div>

        {children}
      </div>
    </div>
  )
}

/** True below the breakpoint where the sidebar becomes a drawer. */
function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setCompact(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return compact
}
