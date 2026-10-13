import { useState } from 'react'
import { MarkdownContent } from './MarkdownContent'

const PREVIEW_PAGE_SIZE = 12

export function CardImportPreview({ cards }) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(cards.length / PREVIEW_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const firstCardIndex = currentPage * PREVIEW_PAGE_SIZE
  const pageCards = cards.slice(firstCardIndex, firstCardIndex + PREVIEW_PAGE_SIZE)

  return (
    <>
      <div className="import-preview__list">
        {pageCards.map((card, index) => (
          <div key={`${card.id}-${firstCardIndex + index}`} className="import-preview__card">
            <MarkdownContent className="import-preview__front" content={card.front} />
            <MarkdownContent className="import-preview__back" content={card.back} />
          </div>
        ))}
      </div>
      {cards.length > PREVIEW_PAGE_SIZE && (
        <nav className="import-preview__pagination" aria-label="Import preview pages">
          <span>
            Cards {firstCardIndex + 1}–{Math.min(firstCardIndex + PREVIEW_PAGE_SIZE, cards.length)} of {cards.length}
          </span>
          <div className="import-preview__pagination-controls">
            <button
              type="button"
              className="button button--outline"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="button button--outline"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </>
  )
}
