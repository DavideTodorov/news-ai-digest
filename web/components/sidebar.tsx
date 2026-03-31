import Link from 'next/link'
import type { DigestDate } from '@/lib/db'
import { formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Props = {
  dates: DigestDate[]
  currentSource: string
  currentDate: string
}

export function Sidebar({ dates, currentSource, currentDate }: Props) {
  return (
    <aside className="w-52 flex-shrink-0 bg-slate-900 text-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/60">
        <p className="font-semibold text-sm tracking-tight">News Digest</p>
        <p className="text-xs text-slate-400 mt-0.5">Daily AI summaries</p>
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 border-b border-slate-700/60 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          BGonAir
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          Investor
        </span>
      </div>

      {/* Date list */}
      <nav className="flex-1 overflow-y-auto py-1.5">
        {dates.map(({ date, sources }) => (
          <Link
            key={date}
            href={`/${currentSource}/${date}`}
            className={cn(
              'flex items-center justify-between px-5 py-2 text-sm transition-colors',
              date === currentDate
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <span className="tabular-nums">{formatDateShort(date)}</span>
            <span className="flex items-center gap-1.5 ml-3">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  sources.includes('bgonair') ? 'bg-emerald-400' : 'bg-slate-600'
                )}
              />
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  sources.includes('investor') ? 'bg-amber-400' : 'bg-slate-600'
                )}
              />
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
