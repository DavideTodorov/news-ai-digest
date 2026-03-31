import Link from 'next/link'
import type { DigestDate } from '@/lib/db'
import { formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

type Props = {
  dates: DigestDate[]
  currentSource: string
  currentDate: string
}

function groupByMonth(dates: DigestDate[]): [string, DigestDate[]][] {
  const map = new Map<string, DigestDate[]>()
  for (const d of dates) {
    const key = d.date.slice(0, 7)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  return Array.from(map.entries())
}

function formatMonth(key: string): string {
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

export function Sidebar({ dates, currentSource, currentDate }: Props) {
  const grouped = groupByMonth(dates)

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* Brand */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 0 18px rgba(99,102,241,0.4)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4 4z" />
              <path d="M8 6h8M8 10h8M8 14h4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-[13px] leading-none" style={{ color: 'var(--text-primary)' }}>
              News Digest
            </p>
            <p className="text-[11px] mt-1 leading-none" style={{ color: 'var(--text-muted)' }}>
              AI summaries
            </p>
          </div>
        </div>
      </div>

      {/* Source legend */}
      <div
        className="px-5 py-3 flex items-center gap-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-bgonair)' }} />
          BGonAir
        </span>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-investor)' }} />
          Investor
        </span>
      </div>

      {/* Date navigation */}
      <nav className="flex-1 overflow-y-auto py-2 min-h-0">
        {grouped.map(([monthKey, monthDates]) => (
          <div key={monthKey} className="mb-2">
            <p
              className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-widest select-none"
              style={{ color: 'var(--text-muted)' }}
            >
              {formatMonth(monthKey)}
            </p>
            {monthDates.map(({ date, sources }) => {
              const isActive = date === currentDate
              return (
                <Link
                  key={date}
                  href={`/${currentSource}/${date}`}
                  className={cn(
                    'flex items-center justify-between px-5 py-[7px] text-[13px] relative transition-colors duration-100',
                    !isActive && 'hover:bg-[var(--bg-hover)]'
                  )}
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--accent-soft)' : undefined,
                  }}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                  <span className="tabular-nums">{formatDateShort(date)}</span>
                  <span className="flex items-center gap-1.5 ml-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: sources.includes('bgonair') ? 'var(--color-bgonair)' : 'var(--text-muted)',
                        opacity: sources.includes('bgonair') ? 1 : 0.3,
                      }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: sources.includes('investor') ? 'var(--color-investor)' : 'var(--text-muted)',
                        opacity: sources.includes('investor') ? 1 : 0.3,
                      }}
                    />
                  </span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      {/* Footer */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Theme
        </span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
