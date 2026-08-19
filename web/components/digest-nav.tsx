'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { Neighbours } from '@/lib/db'
import { formatDateLong } from '@/lib/utils'

type Props = Neighbours & { source: string }

/**
 * Walk the archive a day at a time. This is the only thing waiting at the end
 * of a digest, and the arrow keys do the same thing without the scroll back.
 */
export function DigestNav({ previous, next, source }: Props) {
  useKeyboardDayNav({ previous, next, source })

  if (!previous && !next) return null

  return (
    <nav className="digest-nav" aria-label="Съседни броеве">
      {previous ? (
        <Link href={`/${source}/${previous}`} className="digest-nav-link" rel="prev">
          <span className="digest-nav-label">Предишен ←</span>
          <span className="digest-nav-date">{formatDateLong(previous)}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={`/${source}/${next}`}
          className="digest-nav-link digest-nav-next"
          rel="next"
        >
          <span className="digest-nav-label">→ Следващ</span>
          <span className="digest-nav-date">{formatDateLong(next)}</span>
        </Link>
      )}
    </nav>
  )
}

function useKeyboardDayNav({ previous, next, source }: Props) {
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      const el = e.target as HTMLElement | null
      // Never steal the arrow keys from something being typed in.
      if (el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? '')) return

      if (e.key === 'ArrowLeft' && previous) router.push(`/${source}/${previous}`)
      else if (e.key === 'ArrowRight' && next) router.push(`/${source}/${next}`)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previous, next, source, router])
}
