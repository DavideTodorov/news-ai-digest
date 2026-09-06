// The digest markdown is written by the prompts in summariser/lib/prompts.py.
// Those prompts emit a fixed set of `# ` sections and each one plays a
// different role for the reader, so each is parsed out and set differently.
// An unrecognised heading still renders — it just gets the plain treatment.

export type SectionKind =
  | 'lede'
  | 'markets'
  | 'themes'
  | 'briefs'
  | 'outlook'
  | 'plain'

const SECTION_KINDS: Record<string, SectionKind> = {
  Накратко: 'lede',
  'Основни теми': 'themes',
  'Още от деня': 'briefs',
  'Какво предстои': 'outlook',
  // Investor still writes these, and so do Mediapool digests archived before
  // it moved to the ranked structure, so the older names stay mapped too.
  'Какво се случи вчера': 'lede',
  Пазари: 'markets',
  'Ключови теми': 'themes',
}

export type Theme = {
  id: string
  title: string
}

export type Section = {
  kind: SectionKind
  heading: string | null
  body: string
  /** `###` cluster names inside this section, in document order. */
  themes: Theme[]
  /** Cluster name -> anchor id, for the renderer to hang ids off headings. */
  themeIds: Record<string, string>
}

export type Digest = {
  sections: Section[]
  /** Every cluster in the document — the day's agenda, used by the rail. */
  themes: Theme[]
  readingMinutes: number
}

const H1 = /^#\s+(.+?)\s*$/
const H3 = /^###\s+(.+?)\s*$/

/** Dense news prose in Bulgarian, read attentively rather than skimmed. */
const WORDS_PER_MINUTE = 130

export function parseDigest(markdown: string): Digest {
  const sections: Section[] = []
  const themes: Theme[] = []

  let current: Section = {
    kind: 'plain',
    heading: null,
    body: '',
    themes: [],
    themeIds: {},
  }
  let lines: string[] = []

  const flush = () => {
    current.body = lines.join('\n').trim()
    if (current.body || current.heading) sections.push(current)
    lines = []
  }

  for (const line of markdown.split('\n')) {
    const h1 = H1.exec(line)
    if (h1) {
      flush()
      current = {
        kind: SECTION_KINDS[h1[1]] ?? 'plain',
        heading: h1[1],
        body: '',
        themes: [],
        themeIds: {},
      }
      continue
    }

    const h3 = H3.exec(line)
    if (h3) {
      const title = h3[1]
      // Ids are positional rather than slugified: cluster names are Cyrillic
      // and change daily, so a stable index beats a transliterated slug.
      const theme = { id: `theme-${themes.length}`, title }
      themes.push(theme)
      current.themes.push(theme)
      current.themeIds[title] ??= theme.id
    }

    lines.push(line)
  }
  flush()

  const words = markdown.split(/\s+/).filter(Boolean).length

  return {
    sections,
    themes,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  }
}
