'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function DigestContent({ content }: { content: string }) {
  return (
    <div
      className="prose prose-invert max-w-none
        prose-headings:font-semibold
        prose-h1:text-2xl prose-h1:mb-4
        prose-h2:text-lg prose-h2:mt-10 prose-h2:mb-3 prose-h2:tracking-tight
        prose-h3:text-base prose-h3:mt-7 prose-h3:mb-2
        prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-[color:var(--text-secondary)]
        prose-strong:text-[color:var(--text-primary)] prose-strong:font-semibold
        prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline prose-a:font-normal
        prose-li:text-[15px] prose-li:leading-[1.75] prose-li:text-[color:var(--text-secondary)]
        prose-ul:my-3 prose-ol:my-3
        prose-hr:border-[color:var(--border-subtle)] prose-hr:my-8
        prose-code:text-indigo-300 prose-code:bg-[color:var(--bg-elevated)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal
        prose-blockquote:border-l-indigo-500/50 prose-blockquote:text-[color:var(--text-muted)]"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
