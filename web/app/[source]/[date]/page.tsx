import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDigestContent, getDigestDates } from '@/lib/db'
import { Sidebar } from '@/components/sidebar'
import { DigestContent } from '@/components/digest-content'
import { AppShell } from '@/components/app-shell'
import { formatDateFull } from '@/lib/utils'

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

  const [content, dates] = await Promise.all([
    getDigestContent(date, source),
    getDigestDates(),
  ])

  if (!content) notFound()

  const dateEntry = dates.find((d) => d.date === date)

  return (
    <AppShell sidebar={<Sidebar dates={dates} currentSource={source} currentDate={date} />}>
      {/* Tabs */}
      <div
        className="flex-shrink-0 flex items-end px-4 sm:px-10 h-14 gap-1"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {VALID_SOURCES.map((s) => {
          const available = dateEntry?.sources.includes(s) ?? false
          const isActive = s === source

          if (!available && !isActive) {
            return (
              <span
                key={s}
                className="px-4 pb-3.5 text-[13px] cursor-not-allowed select-none"
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
              className="px-4 pb-3.5 text-[13px] font-medium relative transition-colors duration-100"
              style={{ color: isActive ? 'var(--text)' : 'var(--text-secondary)' }}
            >
              {SOURCE_LABELS[s]}
              {isActive && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                  style={{ background: 'var(--text)' }}
                />
              )}
            </Link>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="content-enter max-w-2xl mx-auto px-4 sm:px-10 pt-10 sm:pt-14 pb-28">
          {/* Editorial date header */}
          <header className="mb-10 pb-8" style={{ borderBottom: '1px solid var(--border)' }}>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em] mb-3"
              style={{ color: 'var(--text-muted)' }}
            >
              Daily Digest
            </p>
            <h1
              className="text-3xl sm:text-4xl font-semibold leading-tight"
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                color: 'var(--text)',
                letterSpacing: '-0.02em',
              }}
            >
              {formatDateFull(date)}
            </h1>
          </header>
          <DigestContent content={content} />
        </div>
      </div>
    </AppShell>
  )
}
