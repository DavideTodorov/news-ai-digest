'use client'

import { useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'

type Props = {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ sidebar, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-out md:relative md:block md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className="ghost absolute top-4 right-3 w-7 h-7 rounded-lg flex items-center justify-center md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>
        {sidebar}
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div
          className="md:hidden flex-shrink-0 flex items-center justify-between px-3 h-12"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <button
              className="ghost p-1.5 rounded-lg"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" />
              </svg>
            </button>
            <span className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
              News Digest
            </span>
          </div>
          <ThemeToggle />
        </div>

        {children}
      </div>
    </div>
  )
}
