import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDigestContent, getDigestCount, getDigestDates, getDigestEntry } from '@/lib/db'
import { SOURCE_CONFIG, VALID_SOURCES, isValidSource } from '@/lib/sources'
import { Sidebar } from '@/components/sidebar'
import { DigestContent } from '@/components/digest-content'
import { AppShell } from '@/components/app-shell'
import { ScrollContent } from '@/components/scroll-content'

export const revalidate = 3600

export default async function DigestPage({
  params,
}: {
  params: Promise<{ source: string; date: string }>
}) {
  const { source, date } = await params

  if (!isValidSource(source)) notFound()

  const [content, initialDates, totalCount] = await Promise.all([
    getDigestContent(date, source),
    getDigestDates(30, 0),
    getDigestCount(),
  ])

  if (!content) notFound()

  const dateEntry =
    initialDates.find((d) => d.date === date) ?? (await getDigestEntry(date))
  const initialHasMore = initialDates.length < totalCount

  const parsed = new Date(date + 'T00:00:00')
  const weekday = parsed.toLocaleDateString('en-GB', { weekday: 'long' })
  const dayMonth = parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const year = parsed.getFullYear()

  return (
    <AppShell
      sidebar={
        <Sidebar
          initialDates={initialDates}
          initialHasMore={initialHasMore}
          currentSource={source}
          currentDate={date}
        />
      }
    >
      {/* Source pills */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 sm:px-10 h-16">
        {VALID_SOURCES.map((s) => {
          const available = dateEntry?.sources.includes(s) ?? false
          const isActive = s === source
          const cfg = SOURCE_CONFIG[s]

          if (!available && !isActive) {
            return (
              <span
                key={s}
                className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium select-none opacity-50 line-through"
                style={{ color: 'var(--text-muted)' }}
                title="No digest for this date"
              >
                {cfg.label}
              </span>
            )
          }

          return (
            <Link
              key={s}
              href={`/${s}/${date}`}
              aria-current={isActive ? 'page' : undefined}
              className="px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-150 hover:-translate-y-[1px]"
              style={{
                background: isActive ? cfg.bg : 'transparent',
                color: isActive ? cfg.color : 'var(--text-secondary)',
                border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {cfg.label}
            </Link>
          )
        })}
      </div>

      {/* Content */}
      <ScrollContent>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 pb-24">
          {/* Dateline */}
          <div className="mb-6 sm:mb-8 px-1">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--accent)' }}
            >
              {weekday}
            </p>
            <h1
              className="mt-1.5 text-3xl sm:text-[40px] leading-[1.1] font-medium tracking-tight"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic' }}
            >
              {dayMonth}
              <span className="ml-2" style={{ color: 'var(--text-muted)' }}>{year}</span>
            </h1>
          </div>

          {/* Digest card */}
          <article
            className="rounded-2xl p-6 sm:p-10"
            style={{
              background: 'var(--bg-card)',
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--border)',
            }}
          >
            <DigestContent content={content} />
          </article>
        </div>
      </ScrollContent>
    </AppShell>
  )
}
