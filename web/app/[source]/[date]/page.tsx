import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDigestContent, getDigestCount, getDigestDates, getDigestEntry } from '@/lib/db'
import { DIGEST_PAGE_SIZE } from '@/lib/constants'
import { SOURCE_CONFIG, VALID_SOURCES, isValidSource } from '@/lib/sources'
import { parseDateline } from '@/lib/utils'
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
    getDigestDates(DIGEST_PAGE_SIZE, 0),
    getDigestCount(),
  ])

  if (!content) notFound()

  const dateEntry =
    initialDates.find((d) => d.date === date) ?? (await getDigestEntry(date))
  const initialHasMore = initialDates.length < totalCount

  const { weekday, dayMonth, year } = parseDateline(date)

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
      {/* Content — a single calm reading column, content as the hero */}
      <ScrollContent>
        <div className="max-w-[680px] mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-32">
          {/* Dateline + quiet source switch */}
          <header className="mb-9 sm:mb-11">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {weekday}
            </p>
            <h1
              className="mt-1 text-[26px] sm:text-[32px] leading-[1.1] font-medium tracking-tight"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-display), Georgia, serif', fontStyle: 'italic' }}
            >
              {dayMonth}
              <span className="ml-2 not-italic" style={{ color: 'var(--text-muted)' }}>{year}</span>
            </h1>

            <nav className="mt-4 flex items-center gap-4 text-[12.5px]" aria-label="Source">
              {VALID_SOURCES.map((s) => {
                const available = dateEntry?.sources.includes(s) ?? false
                const isActive = s === source
                const cfg = SOURCE_CONFIG[s]

                if (!available && !isActive) {
                  return (
                    <span
                      key={s}
                      className="select-none opacity-50 line-through"
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
                    className="transition-colors duration-150 hover:opacity-80"
                    style={{
                      color: isActive ? cfg.color : 'var(--text-muted)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {cfg.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-5 h-px" style={{ background: 'var(--border)' }} />
          </header>

          <DigestContent content={content} />
        </div>
      </ScrollContent>
    </AppShell>
  )
}
