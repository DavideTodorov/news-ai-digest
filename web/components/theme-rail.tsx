'use client'

import { useEffect, useState } from 'react'
import type { Theme } from '@/lib/digest'
import { READER_SCROLL_ID } from '@/lib/constants'

/**
 * The day's clusters, as an index in the reading column's left margin.
 * The clusters are the digest's actual agenda, so the index is the content
 * itself rather than a device laid over it — it marks where you are and lets
 * you jump. Hidden below the width where a margin exists.
 */
export function ThemeRail({ themes }: { themes: Theme[] }) {
  const active = useActiveTheme(themes)

  if (themes.length < 2) return null

  return (
    <nav className="theme-rail" aria-label="Теми в броя">
      <p className="theme-rail-title">Теми</p>
      <ol>
          {themes.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                aria-current={t.id === active ? 'true' : undefined}
                data-active={t.id === active || undefined}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToTheme(t.id)
                }}
              >
                {t.title}
              </a>
            </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * The same index where there is no margin to put it in: folded away under the
 * dateline, so a long day is still navigable on a phone.
 */
export function ThemeIndex({ themes }: { themes: Theme[] }) {
  if (themes.length < 2) return null

  return (
    <details className="theme-index">
      <summary>
        <span>Теми</span>
        <span className="theme-index-count">{themes.length}</span>
      </summary>
      <ol>
        {themes.map((t) => (
          <li key={t.id}>
            <a
              href={`#${t.id}`}
              onClick={(e) => {
                e.preventDefault()
                e.currentTarget.closest('details')?.removeAttribute('open')
                scrollToTheme(t.id)
              }}
            >
              {t.title}
            </a>
          </li>
        ))}
      </ol>
    </details>
  )
}

function scrollToTheme(id: string) {
  const target = document.getElementById(id)
  const scroller = document.getElementById(READER_SCROLL_ID)
  if (!target || !scroller) return

  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top =
    target.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop -
    24

  scroller.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
  // Keep the keyboard where the eye went.
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

/** The last cluster heading to have crossed the top quarter of the viewport. */
function useActiveTheme(themes: Theme[]): string | null {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const scroller = document.getElementById(READER_SCROLL_ID)
    if (!scroller) return

    const headings = themes
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null)
    if (!headings.length) return

    const update = () => {
      const line = scroller.getBoundingClientRect().top + 96
      let current: string | null = null
      for (const el of headings) {
        if (el.getBoundingClientRect().top <= line) current = el.id
        else break
      }
      setActive(current)
    }

    update()
    scroller.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      scroller.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [themes])

  return active
}
