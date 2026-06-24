import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function DigestContent({ content }: { content: string }) {
  return (
    <div
      className="prose max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h1:text-[26px] prose-h1:mt-0 prose-h1:mb-6
        prose-h2:text-[22px] prose-h2:mt-12 prose-h2:mb-3
        prose-h3:text-[18px] prose-h3:mt-8 prose-h3:mb-2
        prose-p:text-[18px] prose-p:leading-[1.8]
        prose-strong:font-semibold
        prose-li:text-[18px] prose-li:leading-[1.8]
        prose-li:my-1.5
        prose-ul:my-4 prose-ol:my-4
        prose-code:text-[15px] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
    >
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
)
}
