import { useStyle } from '../utils'
import { FaArrowLeft } from 'react-icons/fa'
import { useMemo, useState } from 'react'

const getCardStrength = (card) => {
  if (typeof card?.memoryStrength === 'number') return Math.max(0, Math.min(100, card.memoryStrength))
  if (typeof card?.difficulty === 'number') return Math.max(0, Math.min(100, card.difficulty))
  return 0
}

const getCardState = (card) => {
  const isStruggling = (card.lapseCount || 0) > 0 || (card.lastResult ?? 3) < 2
  if (isStruggling) return 'struggling'
  if (card?.state) return card.state
  const strength = getCardStrength(card)
  if (strength >= 80) return 'mastered'
  if (strength >= 55) return 'learning'
  return 'new'
}

const getReviewDate = card => {
  const date = new Date(card?.lastReviewedAt || card?.lastReviewed || 0)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const getDaysSinceReview = card => {
  const reviewedAt = getReviewDate(card)
  return reviewedAt ? (Date.now() - reviewedAt) / (1000 * 60 * 60 * 24) : null
}

const getImprovement = card => {
  const history = Array.isArray(card.reviewHistory) ? card.reviewHistory : []
  if (history.length === 0) return 0
  const adjustment = { 0: -30, 1: -10, 2: 15, 3: 35 }
  const firstReview = history[0]
  const initialStrength = Math.max(0, Math.min(100, (firstReview.strength ?? 0) - (adjustment[firstReview.rating] || 0)))
  return getCardStrength(card) - initialStrength
}

const getAttentionScore = card => {
  const daysSinceReview = getDaysSinceReview(card)
  return (card.lapseCount || 0) * 25 + ((card.lastResult ?? 3) < 2 ? 35 : 0) +
    (daysSinceReview === null ? 10 : Math.min(daysSinceReview, 30)) + (100 - getCardStrength(card)) * 0.2
}

const getRatingCounts = card => {
  const counts = [0, 0, 0, 0]
  const history = Array.isArray(card.reviewHistory) ? card.reviewHistory : []
  if (history.length > 0) {
    history.forEach(entry => {
      if (Number.isInteger(entry.rating) && entry.rating >= 0 && entry.rating <= 3) counts[entry.rating] += 1
    })
  } else if (Number.isInteger(card.lastResult) && card.lastResult >= 0 && card.lastResult <= 3) {
    counts[card.lastResult] = 1
  }
  return counts
}

const STATE_META = {
  new: { label: 'New', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700', bar: 'bg-gray-400' },
  struggling: { label: 'Struggling', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' },
  learning: { label: 'Learning', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500' },
  mastered: { label: 'Mastered', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700', bar: 'bg-green-500' }
}

const formatLastReviewed = (card) => {
  const lastReviewed = card?.lastReviewedAt || card?.lastReviewed
  if (!lastReviewed) return 'Never reviewed'
  const days = Math.floor((Date.now() - new Date(lastReviewed).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Reviewed today'
  if (days === 1) return 'Reviewed yesterday'
  return `Reviewed ${days} days ago`
}

export function CardStats({ deck, onBack }) {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('priority')
  const baseStyles = useStyle()
  const styles = {
    ...baseStyles,
    cardStats: {
      container: 'p-4 pb-20 md:pb-4 md:max-w-4xl md:mx-auto',
      header: 'mb-6 flex items-center gap-3',
      backButton: 'flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200 flex-shrink-0',
      grid: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
      card: 'bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg p-4 flex flex-col gap-3'
    }
  }

  const cards = deck?.cards || []
  const visibleCards = useMemo(() => {
    const filtered = cards.filter(card => {
      const state = getCardState(card)
      const daysSinceReview = getDaysSinceReview(card)
      if (filter === 'attention') return state === 'struggling' || state === 'learning'
      if (filter === 'improving') return getImprovement(card) > 0
      if (filter === 'stale') return daysSinceReview !== null && daysSinceReview >= 7 && state !== 'mastered'
      if (filter === 'unreviewed') return daysSinceReview === null
      if (filter === 'mastered') return state === 'mastered'
      if (filter === 'learning') return state === 'learning'
      return true
    })

    return filtered.sort((a, b) => {
      if (sort === 'priority') return getAttentionScore(b) - getAttentionScore(a)
      if (sort === 'improvement') return getImprovement(b) - getImprovement(a)
      if (sort === 'strength-low') return getCardStrength(a) - getCardStrength(b)
      if (sort === 'strength-high') return getCardStrength(b) - getCardStrength(a)
      if (sort === 'recent') return getReviewDate(b) - getReviewDate(a)
      if (sort === 'reviews') return (b.reviewCount || 0) - (a.reviewCount || 0)
      return 0
    })
  }, [cards, filter, sort])

  return (
    <div className={styles.cardStats.container}>
      <div className={styles.cardStats.header}>
        <button type="button" className={styles.cardStats.backButton} onClick={onBack} aria-label="Back to deck stats">
          <FaArrowLeft />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{deck?.name}</h1>
          <p className="text-sm text-gray-600">{cards.length} card{cards.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {cards.length > 0 ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="sr-only" htmlFor="card-stats-filter">Filter cards</label>
            <select id="card-stats-filter" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800">
              <option value="all">All cards</option>
              <option value="attention">Needs attention</option>
              <option value="improving">Improving</option>
              <option value="stale">Stale (7+ days)</option>
              <option value="unreviewed">Never reviewed</option>
              <option value="learning">Learning</option>
              <option value="mastered">Mastered</option>
            </select>
            <label className="sr-only" htmlFor="card-stats-sort">Sort cards</label>
            <select id="card-stats-sort" value={sort} onChange={event => setSort(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800">
              <option value="priority">Review priority</option>
              <option value="improvement">Most improved</option>
              <option value="strength-low">Lowest strength</option>
              <option value="strength-high">Highest strength</option>
              <option value="recent">Recently reviewed</option>
              <option value="reviews">Most reviewed</option>
            </select>
          </div>
          <p className="mb-3 text-xs text-gray-500">Showing {visibleCards.length} of {cards.length} cards</p>
          {visibleCards.length > 0 ? (
            <div className={styles.cardStats.grid}>
          {visibleCards.map(card => {
            const state = getCardState(card)
            const meta = STATE_META[state]
            const strength = getCardStrength(card)
            const improvement = getImprovement(card)
            const ratingCounts = getRatingCounts(card)
            return (
              <section key={card.id} className={styles.cardStats.card}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{card.front}</p>
                    <p className="text-sm text-gray-500 truncate">{card.back}</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    {improvement > 0 && <span className="text-[11px] font-medium text-emerald-700">+{improvement} strength</span>}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Memory strength</span>
                    <span>{strength}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${meta.bar}`} style={{ width: `${strength}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Again', color: 'text-red-600' },
                    { label: 'Hard', color: 'text-orange-600' },
                    { label: 'Good', color: 'text-emerald-700' },
                    { label: 'Easy', color: 'text-blue-700' }
                  ].map(({ label, color }, rating) => (
                    <div key={label} className="rounded-lg bg-gray-50 p-2">
                      <div className={`text-sm font-bold ${color}`}>{ratingCounts[rating]}</div>
                      <div className="text-[11px] text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400">{formatLastReviewed(card)}</p>
              </section>
            )
          })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">No cards match these filters.</p>
          )}
        </>
      ) : (
        <p className="text-gray-600">This deck has no cards yet.</p>
      )}
    </div>
  )
}
