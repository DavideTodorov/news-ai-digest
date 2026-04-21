'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { DigestDate } from '@/lib/db'
import { formatDateShort } from '@/lib/utils'
import { SOURCE_CONFIG, isValidSource } from '@/lib/sources'
import { SidebarScrollToActive } from '@/components/sidebar-scroll-active'

const PAGE_SIZE = 30

type Props = {
  initialDates: DigestDate[]
  initialHasMore: boolean
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

export function SidebarDateList({
  initialDates,
  initialHasMore,
  currentSource,
  currentDate,
}: Props) {
  const [dates, setDates] = useState(initialDates)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const grouped = groupByMonth(dates)

  async function loadMore() {
    if (loading || !hasMore) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/digest-dates?offset=${dates.length}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const next: DigestDate[] = await res.json()
      setDates((prev) => [...prev, ...next])
      if (next.length < PAGE_SIZE) setHasMore(false)
    } catch (e) {
      setError('Failed to load — tap to retry')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="flex-1 overflow-y-auto min-h-0 px-2 pb-2">
      <SidebarScrollToActive />
      {grouped.map(([monthKey, monthDates]) => (
        <div key={monthKey}>
          <p
            className="px-3 pt-5 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] select-none"
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
                data-sidebar-active={active || undefined}
                aria-current={active ? 'page' : undefined}
                className="sidebar-item group flex items-center gap-2 px-3 py-[7px] rounded-lg text-[13px] transition-colors duration-100"
                style={{
                  color: active ? 'var(--text)' : 'var(--text-secondary)',
                  background: active ? 'var(--bg-active)' : undefined,
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span className="tabular-nums flex-1 truncate">{formatDateShort(date)}</span>
                <span className="flex gap-1 flex-shrink-0" aria-hidden>
                  {sources.map((s) =>
                    isValidSource(s) ? (
                      <span
                        key={s}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: SOURCE_CONFIG[s].color }}
                      />
                    ) : null
                  )}
                </span>
              </Link>
            )
          })}
        </div>
      ))}

      {hasMore && (
        <div className="px-1 pt-3">
          <button
            onClick={loadMore}
            disabled={loading}
            className="ghost w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium disabled:opacity-60 disabled:cursor-wait"
            style={{ color: error ? 'var(--accent)' : undefined }}
          >
            {!loading && !error && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 4.5L6 7.5L9 4.5" />
              </svg>
            )}
            {loading ? 'Loading…' : error ?? 'Load more'}
          </button>
        </div>
      )}
    </nav>
  )
}
