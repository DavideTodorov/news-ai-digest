import Link from 'next/link'
import type { DigestDate } from '@/lib/db'
import { formatDateShort } from '@/lib/utils'
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

      {/* Legend */}
      <div
        className="px-5 py-2.5 flex gap-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--source-a)' }} />
          BG
        </span>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--source-b)' }} />
          INV
        </span>
      </div>

      {/* Dates */}
      <nav className="flex-1 overflow-y-auto py-1 min-h-0">
        {grouped.map(([monthKey, monthDates]) => (
          <div key={monthKey}>
            <p
              className="px-5 pt-4 pb-1 text-[10px] font-medium uppercase tracking-wider select-none"
              style={{ color: 'var(--text-muted)' }}
            >
              {formatMonth(monthKey)}
            </p>
            {monthDates.map(({ date, sources }) => {
              const active = date === currentDate
              return (
                <Link
                  key={date}
                  href={`/${currentSource}/${date}`}
                  className="flex items-center justify-between px-5 py-[6px] text-[13px] relative transition-colors duration-100"
                  style={{
                    color: active ? 'var(--text)' : 'var(--text-secondary)',
                    background: active ? 'var(--bg-active)' : undefined,
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-sm"
                      style={{ background: 'var(--text)' }}
                    />
                  )}
                  <span className="tabular-nums">{formatDateShort(date)}</span>
                  <span className="flex gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: sources.includes('bgonair') ? 'var(--source-a)' : 'transparent',
                      }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: sources.includes('investor') ? 'var(--source-b)' : 'transparent',
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
        className="px-5 py-3 flex justify-end flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <ThemeToggle />
      </div>
    </aside>
  )
}
