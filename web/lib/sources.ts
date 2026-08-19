export const SOURCE_CONFIG = {
  mediapool: {
    label: 'Mediapool',
    color: 'var(--source-mediapool)',
  },
  // Retained so archived digests fetched before the Mediapool swap still resolve.
  bgonair: {
    label: 'BGonAir',
    color: 'var(--source-bgonair)',
  },
  investor: {
    label: 'Investor.bg',
    color: 'var(--source-investor)',
  },
} as const

export type SourceKey = keyof typeof SOURCE_CONFIG

export const VALID_SOURCES = Object.keys(SOURCE_CONFIG) as SourceKey[]

export function isValidSource(s: string): s is SourceKey {
  return s in SOURCE_CONFIG
}

/**
 * The source to open a given date in: the one being read if it published that
 * day, otherwise whichever did. Sources come and go over the archive's life,
 * so a date link must never assume the current source covers it.
 */
export function resolveSource(
  available: readonly string[],
  preferred: string
): SourceKey | null {
  if (isValidSource(preferred) && available.includes(preferred)) return preferred
  return VALID_SOURCES.find((s) => available.includes(s)) ?? null
}
