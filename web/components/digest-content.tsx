'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function DigestContent({ content }: { content: string }) {
  return (
    <div
      className="prose max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h2:text-[18px] prose-h2:mt-10 prose-h2:mb-3
        prose-h3:text-[16px] prose-h3:mt-7 prose-h3:mb-2
        prose-p:text-[15.5px] prose-p:leading-[1.75]
        prose-strong:font-semibold
        prose-li:text-[15.5px] prose-li:leading-[1.75]
        prose-li:my-0.5
        prose-ul:my-3 prose-ol:my-3
        prose-code:text-[13px] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
