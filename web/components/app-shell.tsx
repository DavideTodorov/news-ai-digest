'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'

type Props = {
  sidebar: React.ReactNode
  /** The colour of the source being read — the chrome takes it on. */
  accent: string
  children: React.ReactNode
}

export function AppShell({ sidebar, accent, children }: Props) {
  const [open, setOpen] = useState(false)
  const isCompact = useIsCompact()
  const pathname = usePathname()
  const openerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Picking a date is the whole point of the drawer, so close it on arrival.
  useEffect(() => setOpen(false), [pathname])

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

  // Off-screen on mobile means out of reach for the keyboard too.
  const hidden = isCompact && !open

  return (
    <div className="flex h-full overflow-hidden" style={{ '--accent': accent } as React.CSSProperties}>
      {open && (
        <div className="drawer-scrim md:hidden" onClick={() => setOpen(false)} />
      )}

      <div
        ref={drawerRef}
        className={`drawer ${open ? 'is-open' : ''}`}
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
        {sidebar}
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
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
