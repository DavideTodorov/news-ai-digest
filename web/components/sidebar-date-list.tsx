'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { DigestDate } from '@/lib/db'
import { formatDateShort } from '@/lib/utils'
import { SidebarScrollToActive } from '@/components/sidebar-scroll-active'

const PAGE_SIZE = 10

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

  const grouped = groupByMonth(dates)

  async function loadMore() {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res = await fetch(`/api/digest-dates?offset=${dates.length}`)
      const next: DigestDate[] = await res.json()
      setDates((prev) => [...prev, ...next])
      if (next.length < PAGE_SIZE) setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="flex-1 overflow-y-auto py-1 min-h-0">
      <SidebarScrollToActive />
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
                data-sidebar-active={active || undefined}
                className="sidebar-link flex items-center px-5 py-[6px] text-[13px] relative transition-colors duration-100"
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
              </Link>
            )
          })}
        </div>
      ))}
      {hasMore && (
        <div className="px-5 py-3">
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full text-[12px] py-1.5 rounded transition-colors duration-100 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-active)' }}
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </nav>
  )
}
