const MASTERY_POINTS_BY_RATING = { 1: 2, 2: 3, 3: 4 }
const MASTERY_POINTS_REQUIRED = 20

export const getCardStrength = (card) => {
  if (typeof card?.memoryStrength === 'number') return Math.max(0, Math.min(100, card.memoryStrength))
  if (typeof card?.difficulty === 'number') return Math.max(0, Math.min(100, card.difficulty))
  return 0
}

const getMasteryPoints = (card) => {
  const history = Array.isArray(card?.reviewHistory) ? card.reviewHistory : []
  return history.reduce((points, review) => {
    if (review?.rating === 0) return 0
    return points + (MASTERY_POINTS_BY_RATING[review?.rating] || 0)
  }, 0)
}

export const getCardState = (card) => {
  const history = Array.isArray(card?.reviewHistory) ? card.reviewHistory : []
  const latestHistoryRating = history[history.length - 1]?.rating
  const latestRating = Number.isInteger(card?.lastResult)
    ? card.lastResult
    : Number.isInteger(latestHistoryRating)
      ? latestHistoryRating
      : null
  const hasReviewHistory = history.length > 0
  const isStruggling = latestRating === null
    ? (card?.lapseCount || 0) > 0 || card?.state === 'struggling'
    : latestRating < 2

  if (hasReviewHistory && getMasteryPoints(card) >= MASTERY_POINTS_REQUIRED) return 'mastered'
  if (isStruggling) return 'struggling'

  const hasBeenReviewed = (card?.reviewCount || 0) > 0 ||
    hasReviewHistory ||
    Boolean(card?.lastReviewedAt || card?.lastReviewed) ||
    Number.isInteger(card?.lastResult)

  if (card?.state === 'mastered' && !hasReviewHistory) return 'mastered'
  if (card?.state === 'learning') return 'learning'

  const strength = getCardStrength(card)
  if (!hasReviewHistory && strength >= 80) return 'mastered'
  if (strength >= 55) return 'learning'
  return hasBeenReviewed ? 'learning' : 'new'
}

export const matchesStudyStatusFilters = (card, options = {}) => (
  (options.onlyNew && getCardState(card) === 'new') ||
  (options.onlyMissed && getCardState(card) === 'struggling') ||
  (options.onlyLearning && getCardState(card) === 'learning') ||
  (options.onlyMastered && getCardState(card) === 'mastered')
)

export const getImprovement = (card) => {
  const history = Array.isArray(card.reviewHistory) ? card.reviewHistory : []
  if (history.length === 0) return 0
  const adjustment = { 0: -30, 1: -10, 2: 15, 3: 35 }
  const firstReview = history[0]
  const initialStrength = Math.max(0, Math.min(100, (firstReview.strength ?? 0) - (adjustment[firstReview.rating] || 0)))
  return getCardStrength(card) - initialStrength
}

export const getRatingCounts = (card) => {
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

export const STATE_META = {
  new: { label: 'New', dot: 'deck-status-new deck-status-dot', badge: 'deck-status-new deck-status-badge', bar: 'deck-status-new deck-status-bar' },
  struggling: { label: 'Weak', dot: 'deck-status-struggling deck-status-dot', badge: 'deck-status-struggling deck-status-badge', bar: 'deck-status-struggling deck-status-bar' },
  learning: { label: 'Learning', dot: 'deck-status-learning deck-status-dot', badge: 'deck-status-learning deck-status-badge', bar: 'deck-status-learning deck-status-bar' },
  mastered: { label: 'Mastered', dot: 'deck-status-mastered deck-status-dot', badge: 'deck-status-mastered deck-status-badge', bar: 'deck-status-mastered deck-status-bar' }
}

export const formatLastReviewed = (card) => {
  const lastReviewed = card?.lastReviewedAt || card?.lastReviewed
  if (!lastReviewed) return 'Never reviewed'
  const days = Math.floor((Date.now() - new Date(lastReviewed).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Reviewed today'
  if (days === 1) return 'Reviewed yesterday'
  return `Reviewed ${days} days ago`
}