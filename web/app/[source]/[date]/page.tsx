import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDigestContent, getDigestDates } from '@/lib/db'
import { Sidebar } from '@/components/sidebar'
import { DigestContent } from '@/components/digest-content'
import { formatDate } from '@/lib/utils'

export const revalidate = 3600

const VALID_SOURCES = ['bgonair', 'investor']

const SOURCE_LABELS: Record<string, string> = {
  bgonair: 'BGonAir',
  investor: 'Investor.bg',
}

const SOURCE_COLOR: Record<string, string> = {
  bgonair: 'var(--color-bgonair)',
  investor: 'var(--color-investor)',
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
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar dates={dates} currentSource={source} currentDate={date} />

      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <div
          className="flex-shrink-0 px-8 flex items-center gap-1"
          style={{
            height: '48px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          {VALID_SOURCES.map((s) => {
            const available = dateEntry?.sources.includes(s) ?? false
            const isActive = s === source

            if (!available && !isActive) {
              return (
                <span
                  key={s}
                  className="px-3 py-1.5 text-xs font-medium rounded-md cursor-not-allowed select-none"
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
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
                style={{
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                {SOURCE_LABELS[s]}
              </Link>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Digest header */}
          <div
            className="px-14 pt-12 pb-9"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: SOURCE_COLOR[source] }}
                />
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: SOURCE_COLOR[source] }}
                >
                  {SOURCE_LABELS[source]}
                </span>
              </div>
              <h1 className="text-[28px] font-bold leading-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                Daily Digest
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {formatDate(date)}
              </p>
            </div>
          </div>

          {/* Digest body */}
          <div className="px-14 py-10">
            <div className="max-w-2xl">
              <DigestContent content={content} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
