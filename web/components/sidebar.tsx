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
      className="w-52 flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          News Digest
        </h1>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
          AI-powered summaries
        </p>
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
        className="px-5 py-3 flex justify-end flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <ThemeToggle />
      </div>
    </aside>
  )
}
