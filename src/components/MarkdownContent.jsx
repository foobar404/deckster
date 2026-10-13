import { lazy, Suspense } from 'react'
import '../css/markdown-content.css'

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))

export function MarkdownContent({ content, className = '', style, title }) {
  const markdown = typeof content === 'string' ? content : ''
  const wrapperClass = `markdown-content${className ? ` ${className}` : ''}`

  return (
    <Suspense fallback={<div className={wrapperClass} style={style} title={title}>{markdown}</div>}>
      <MarkdownRenderer content={markdown} className={className} style={style} title={title} />
    </Suspense>
  )
}
