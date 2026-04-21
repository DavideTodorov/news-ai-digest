import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDigestContent, getDigestCount, getDigestDates, getDigestEntry } from '@/lib/db'
import { Sidebar } from '@/components/sidebar'
import { DigestContent } from '@/components/digest-content'
import { AppShell } from '@/components/app-shell'
import { ScrollContent } from '@/components/scroll-content'
import { formatDate } from '@/lib/utils'

export const revalidate = 3600

const VALID_SOURCES = ['bgonair', 'investor']

const SOURCE_LABELS: Record<string, string> = {
  bgonair: 'BGonAir',
  investor: 'Investor.bg',
}

export default async function DigestPage({
  params,
}: {
  params: Promise<{ source: string; date: string }>
}) {
  const { source, date } = await params

  if (!VALID_SOURCES.includes(source)) notFound()

  const [content, initialDates, totalCount] = await Promise.all([
    getDigestContent(date, source),
    getDigestDates(30, 0),
    getDigestCount(),
  ])

  if (!content) notFound()

  const dateEntry =
    initialDates.find((d) => d.date === date) ?? (await getDigestEntry(date))
  const initialHasMore = initialDates.length < totalCount

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
      {/* Tabs */}
      <div
        className="flex-shrink-0 flex items-end px-4 sm:px-10 h-12"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {VALID_SOURCES.map((s) => {
          const available = dateEntry?.sources.includes(s) ?? false
          const isActive = s === source

          if (!available && !isActive) {
            return (
              <span
                key={s}
                className="px-3 pb-3 text-[13px] cursor-not-allowed select-none"
                style={{ color: 'var(--text-muted)' }}
                title="No digest for this date"
              >
                {SOURCE_LABELS[s]}
              </span>
            )
          }

          return (
            <Link
              key={s}
              href={`/${s}/${date}`}
              className="px-3 pb-3 text-[13px] font-medium relative transition-colors duration-100"
              style={{ color: isActive ? 'var(--text)' : 'var(--text-secondary)' }}
            >
              {SOURCE_LABELS[s]}
              {isActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[1.5px] rounded-full"
                  style={{ background: 'var(--text)' }}
                />
              )}
            </Link>
          )
        })}
      </div>

      {/* Content */}
      <ScrollContent>
        <div className="max-w-2xl mx-auto px-4 sm:px-10 pt-8 sm:pt-10 pb-24">
          <p
            className="text-xs font-medium uppercase tracking-wider mb-8"
            style={{ color: 'var(--text-muted)' }}
          >
            {formatDate(date)}
          </p>
          <DigestContent content={content} />
        </div>
      </ScrollContent>
    </AppShell>
  )
}
