import { getCardState } from '../utils'

const STATUSES = [
  { key: 'new', label: 'New' },
  { key: 'struggling', label: 'Weak' },
  { key: 'learning', label: 'Learning' },
  { key: 'mastered', label: 'Mastered' }
]

export const getDeckStatusCounts = (cards = []) => cards.reduce((counts, card) => {
  counts[getCardState(card)] += 1
  return counts
}, { new: 0, struggling: 0, learning: 0, mastered: 0 })

export function DeckStatusSummary({ cards = [] }) {
  const counts = getDeckStatusCounts(cards)
  const total = cards.length
  const statusDescription = STATUSES.map(({ label, key }) => `${label}: ${counts[key]}`).join(', ')

  return (
    <div className="deck-status-summary">
      <div className="deck-status-summary__meta">
        <span>Card status</span>
        <span>{total} card{total === 1 ? '' : 's'}</span>
      </div>
      <div
        role="img"
        aria-label={`${total} cards. ${statusDescription}`}
        className="deck-status-summary__bar"
      >
        {STATUSES.map(({ key }) => counts[key] > 0 && (
          <span
            key={key}
            className={`deck-status-bar deck-status-${key}`}
            style={{ width: `${(counts[key] / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="deck-status-summary__legend">
        {STATUSES.map(({ key, label }) => (
          <span key={key} className="deck-status-summary__item">
            <span className="deck-status-summary__label">
              <span className={`deck-status-dot deck-status-${key}`} />
              <span>{label}</span>
            </span>
            <span className="deck-status-summary__count">{counts[key]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}