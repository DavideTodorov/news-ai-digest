import Link from 'next/link'

/** Nothing to read — say what will change that, and offer the way back. */
export function EmptyState({
  title,
  body,
  home = false,
}: {
  title: string
  body: string
  home?: boolean
}) {
  return (
    <main className="empty-state">
      <p className="empty-state-mark">News Digest</p>
      <h1>{title}</h1>
      <p>{body}</p>
      {home && (
        <Link href="/" className="empty-state-link">
          Към последния брой
        </Link>
      )}
    </main>
  )
}
