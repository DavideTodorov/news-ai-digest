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
        <h1
          className="text-sm font-semibold tracking-tight"
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            color: 'var(--text)',
          }}
        >
          News Digest
        </h1>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
          AI-powered summaries
        </p>
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
            {monthDates.map(({ date }) => {
              const active = date === currentDate
              return (
                <Link
                  key={date}
                  href={`/${currentSource}/${date}`}
                  className="flex items-center px-5 py-[7px] text-[13px] relative transition-colors duration-100"
                  style={{
                    color: active ? 'var(--text)' : 'var(--text-secondary)',
                    background: active ? 'var(--bg-active)' : undefined,
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full"
                      style={{ background: 'var(--text)' }}
                    />
                  )}
                  <span className="tabular-nums">{formatDateShort(date)}</span>
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
