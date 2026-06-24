import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function DigestContent({ content }: { content: string }) {
  return (
    <div
      className="prose max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h1:text-[23px] prose-h1:mt-0 prose-h1:mb-5
        prose-h2:text-[21px] prose-h2:mt-11 prose-h2:mb-3
        prose-h3:text-[17px] prose-h3:mt-7 prose-h3:mb-2
        prose-p:text-[17px] prose-p:leading-[1.72]
        prose-strong:font-semibold
        prose-li:text-[17px] prose-li:leading-[1.72]
        prose-li:my-1
        prose-ul:my-3 prose-ol:my-3
        prose-code:text-[14px] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
