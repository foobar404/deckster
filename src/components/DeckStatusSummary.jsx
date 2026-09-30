import { getCardState } from '../utils'

const STATUSES = [
  { key: 'new', label: 'New', color: 'deck-status-new deck-status-bar' },
  { key: 'struggling', label: 'Weak', color: 'deck-status-struggling deck-status-bar' },
  { key: 'learning', label: 'Learning', color: 'deck-status-learning deck-status-bar' },
  { key: 'mastered', label: 'Mastered', color: 'deck-status-mastered deck-status-bar' }
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
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
        <span>Card status</span>
        <span>{total} card{total === 1 ? '' : 's'}</span>
      </div>
      <div
        role="img"
        aria-label={`${total} cards. ${statusDescription}`}
        className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200"
      >
        {STATUSES.map(({ key, color }) => counts[key] > 0 && (
          <span
            key={key}
            className={`h-full ${color}`}
            style={{ width: `${(counts[key] / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
        {STATUSES.map(({ key, label, color }) => (
          <span key={key} className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${color}`} />
              <span className="truncate">{label}</span>
            </span>
            <span className="shrink-0 font-semibold text-gray-800">{counts[key]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}