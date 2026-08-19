import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Section } from '@/lib/digest'

/**
 * Each section of the digest is set for the job it does. The lede is written
 * to stand alone for a reader who stops after it, so it is set largest; the
 * cluster names carry the body; the forward-look closes.
 */
export function DigestContent({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section, i) => (
        <section key={i} className={`digest-section digest-${section.kind}`}>
          {section.heading && <SectionHeading section={section} />}
          <div className="prose max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // The dateline owns the page's h1, so sections start at h2.
                h1: ({ children }) => <h2>{children}</h2>,
                h3: ({ children }) => (
                  <h3 id={section.themeIds[textOf(children)]}>{children}</h3>
                ),
              }}
            >
              {stripHeading(section.body)}
            </ReactMarkdown>
          </div>
        </section>
      ))}
    </>
  )
}

function SectionHeading({ section }: { section: Section }) {
  // "Ключови теми" only names the container — the cluster headings underneath
  // say what the day was actually about, so it steps back to a marker.
  if (section.kind === 'themes') {
    return (
      <div className="themes-marker">
        <span>{section.heading}</span>
      </div>
    )
  }

  // The lede's heading is the same words every day; it labels rather than
  // announces, so it is set as an eyebrow above the standfirst.
  if (section.kind === 'lede') {
    return <p className="lede-eyebrow">{section.heading}</p>
  }

  return <h2 className="section-heading">{section.heading}</h2>
}

/** The heading is rendered separately, so drop it from the markdown body. */
function stripHeading(body: string): string {
  return body.replace(/^#\s+.+\n?/, '').trim()
}

function textOf(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(textOf).join('')
  return ''
}
