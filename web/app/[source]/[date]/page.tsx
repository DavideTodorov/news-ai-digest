import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getDigestContent,
  getDigestCount,
  getDigestDates,
  getDigestEntry,
  getNeighbouringDates,
  getDateRank,
} from '@/lib/db'
import { DIGEST_PAGE_SIZE } from '@/lib/constants'
import { SOURCE_CONFIG, VALID_SOURCES, isValidSource } from '@/lib/sources'
import { parseDateline } from '@/lib/utils'
import { parseDigest } from '@/lib/digest'
import { Sidebar } from '@/components/sidebar'
import { DigestContent } from '@/components/digest-content'
import { AppShell } from '@/components/app-shell'
import { ScrollContent } from '@/components/scroll-content'
import { ThemeRail, ThemeIndex } from '@/components/theme-rail'
import { DigestNav } from '@/components/digest-nav'

export const revalidate = 3600

type Params = Promise<{ source: string; date: string }>

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { source, date } = await params
  if (!isValidSource(source)) return { title: 'News Digest' }

  const { dayMonth, year } = parseDateline(date)
  // Every digest is a different document; the tab and the history entry
  // should say which one.
  return { title: `${dayMonth} ${year} — ${SOURCE_CONFIG[source].label}` }
}

export default async function DigestPage({ params }: { params: Params }) {
  const { source, date } = await params

  if (!isValidSource(source)) notFound()

  const [content, totalCount, neighbours, rank] = await Promise.all([
    getDigestContent(date, source),
    getDigestCount(),
    getNeighbouringDates(date, source),
    getDateRank(date),
  ])

  if (!content) notFound()

  // Load whole pages, but always at least far enough back that the date being
  // read is in the list — a deep link should still show you where you are.
  const initialCount =
    Math.ceil((rank + 1) / DIGEST_PAGE_SIZE) * DIGEST_PAGE_SIZE
  const initialDates = await getDigestDates(initialCount, 0)

  const dateEntry =
    initialDates.find((d) => d.date === date) ?? (await getDigestEntry(date))
  const initialHasMore = initialDates.length < totalCount

  const { weekday, dayMonth, year } = parseDateline(date)
  const { sections, themes, readingMinutes } = parseDigest(content)
  const cfg = SOURCE_CONFIG[source]

  return (
    <AppShell
      accent={cfg.color}
      sidebar={
        <Sidebar
          initialDates={initialDates}
          initialHasMore={initialHasMore}
          currentSource={source}
          currentDate={date}
        />
      }
    >
      {/* A single calm reading column, with the day's themes in the margin */}
      <ScrollContent>
        <div className="reader-layout">
          <ThemeRail themes={themes} />

          <article className="reader">
          <header className="dateline">
            <p className="dateline-weekday">{weekday}</p>
            <h1 className="dateline-date">
              {dayMonth}
              <span className="dateline-year">{year}</span>
            </h1>

            <div className="dateline-meta">
              <nav className="source-switch" aria-label="Източник">
                {VALID_SOURCES.map((s) => {
                  const available = dateEntry?.sources.includes(s) ?? false
                  const isActive = s === source

                  // A source with nothing to show for this date is stated, not
                  // offered — a dead link here would land on a 404.
                  if (!available) {
                    if (!isActive) return null
                    return (
                      <span key={s} data-current style={{ color: SOURCE_CONFIG[s].color }}>
                        {SOURCE_CONFIG[s].label}
                      </span>
                    )
                  }

                  return (
                    <Link
                      key={s}
                      href={`/${s}/${date}`}
                      aria-current={isActive ? 'page' : undefined}
                      data-current={isActive || undefined}
                      style={isActive ? { color: SOURCE_CONFIG[s].color } : undefined}
                    >
                      {SOURCE_CONFIG[s].label}
                    </Link>
                  )
                })}
              </nav>
              <span className="reading-time">{readingMinutes} мин четене</span>
            </div>
            <ThemeIndex themes={themes} />
          </header>

          <DigestContent sections={sections} />

            <DigestNav {...neighbours} source={source} />
          </article>
        </div>
      </ScrollContent>
    </AppShell>
  )
}
