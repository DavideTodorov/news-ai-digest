'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function DigestContent({ content }: { content: string }) {
  return (
    <div className="prose prose-slate prose-sm sm:prose-base max-w-none
      prose-headings:font-semibold prose-headings:text-slate-900
      prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
      prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
      prose-p:text-gray-700 prose-p:leading-relaxed
      prose-strong:text-slate-900
      prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
      prose-li:text-gray-700
      prose-hr:border-gray-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
