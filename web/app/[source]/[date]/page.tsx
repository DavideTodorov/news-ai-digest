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
    <div className="flex h-full overflow-hidden bg-white">
      <Sidebar dates={dates} currentSource={source} currentDate={date} />

      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Source tabs */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-8">
          <div className="flex gap-1">
            {VALID_SOURCES.map((s) => {
              const available = dateEntry?.sources.includes(s) ?? false
              const isActive = s === source

              if (!available && !isActive) {
                return (
                  <span
                    key={s}
                    className="px-4 py-4 text-sm font-medium border-b-2 border-transparent text-gray-300 cursor-not-allowed"
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
                  className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {SOURCE_LABELS[s]}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Digest content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {SOURCE_LABELS[source]}
            </h1>
            <p className="text-sm text-gray-400 mb-8">{formatDate(date)}</p>
            <DigestContent content={content} />
          </div>
        </div>
      </main>
    </div>
  )
}
