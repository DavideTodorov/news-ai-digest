export const SOURCE_CONFIG = {
  bgonair: {
    label: 'BGonAir',
    color: 'var(--source-bgonair)',
    bg: 'var(--source-bgonair-bg)',
  },
  investor: {
    label: 'Investor.bg',
    color: 'var(--source-investor)',
    bg: 'var(--source-investor-bg)',
  },
} as const

export type SourceKey = keyof typeof SOURCE_CONFIG

export const VALID_SOURCES = Object.keys(SOURCE_CONFIG) as SourceKey[]

export function isValidSource(s: string): s is SourceKey {
  return s in SOURCE_CONFIG
}
