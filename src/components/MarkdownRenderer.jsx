import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components = {
  img: ({ src, alt, title }) => (
    <img src={src} alt={alt || ''} title={title} loading="lazy" decoding="async" />
  )
}

export default function MarkdownRenderer({ content, className = '', style, title }) {
  return (
    <div className={`markdown-content${className ? ` ${className}` : ''}`} style={style} title={title}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>
    </div>
  )
}
