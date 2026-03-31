'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function DigestContent({ content }: { content: string }) {
  return (
    <div
      className="prose max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h2:text-[17px] prose-h2:mt-10 prose-h2:mb-3
        prose-h3:text-[17px] prose-h3:mt-7 prose-h3:mb-2
        prose-p:text-[16px] prose-p:leading-[1.8]
        prose-strong:font-semibold
        prose-a:underline prose-a:underline-offset-2 prose-a:decoration-1
        prose-li:text-[16px] prose-li:leading-[1.8]
        prose-hr:my-10
        prose-code:text-[13px] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
