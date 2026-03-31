'use client'

import { useState } from 'react'

type Props = {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ sidebar, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-200 md:relative md:block md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile close button */}
        <button
          className="absolute top-4 right-3 p-1 rounded md:hidden"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>
        {sidebar}
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div
          className="md:hidden flex-shrink-0 flex items-center gap-3 px-4 h-12"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <button
            className="p-1 rounded"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 4.5h14M2 9h14M2 13.5h14" />
            </svg>
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            News Digest
          </span>
        </div>

        {children}
      </div>
    </div>
  )
}
