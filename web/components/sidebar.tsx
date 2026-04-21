import type { DigestDate } from '@/lib/db'
import { ThemeToggle } from '@/components/theme-toggle'
import { SidebarDateList } from '@/components/sidebar-date-list'

type Props = {
  initialDates: DigestDate[]
  initialHasMore: boolean
  currentSource: string
  currentDate: string
}

export function Sidebar({ initialDates, initialHasMore, currentSource, currentDate }: Props) {
  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--source-investor))',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h10M2 7h10M2 11h6" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-[13px] font-semibold tracking-tight leading-tight" style={{ color: 'var(--text)' }}>
            News Digest
          </h1>
          <p className="text-[10.5px] leading-tight" style={{ color: 'var(--text-muted)' }}>
            Daily AI summaries
          </p>
        </div>
      </div>

      {/* Dates */}
      <SidebarDateList
        initialDates={initialDates}
        initialHasMore={initialHasMore}
        currentSource={currentSource}
        currentDate={currentDate}
      />

      {/* Footer */}
      <div
        className="px-4 py-2.5 flex justify-end flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <ThemeToggle />
      </div>
    </aside>
  )
}
