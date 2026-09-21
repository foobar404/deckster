import { useStyle } from '../utils'
import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { FaExclamationTriangle, FaPlay } from 'react-icons/fa'

const getCardStrength = (card) => {
  if (typeof card?.memoryStrength === 'number') return Math.max(0, Math.min(100, card.memoryStrength))
  if (typeof card?.difficulty === 'number') return Math.max(0, Math.min(100, card.difficulty))
  return 0
}

const getCardState = (card) => {
  if (card?.state) return card.state
  const strength = getCardStrength(card)
  if (strength >= 80) return 'mastered'
  if (strength >= 55) return 'learning'
  return 'new'
}

const getDaysSinceReview = (card) => {
  const lastReviewed = card?.lastReviewedAt || card?.lastReviewed
  if (!lastReviewed) return null
  return Math.max(0, (Date.now() - new Date(lastReviewed).getTime()) / (1000 * 60 * 60 * 24))
}

const getDeckInsights = (deck) => {
  const cards = deck.cards || []
  const counts = cards.reduce((result, card) => {
    const state = getCardState(card)
    result[state] += 1
    if (card.lastReviewedAt || card.lastReviewed) result.reviewed += 1
    if ((card.lapseCount || 0) > 0 || (card.lastResult ?? 3) < 2) result.struggling += 1
    if (getDaysSinceReview(card) >= 7 && state !== 'mastered') result.stale += 1
    return result
  }, { new: 0, learning: 0, mastered: 0, struggling: 0, stale: 0, reviewed: 0 })

  const priority = counts.struggling * 4 + counts.stale * 3 + counts.learning * 2 + counts.new

  return {
    ...counts,
    total: cards.length,
    priority,
    progress: cards.length ? Math.round((counts.mastered / cards.length) * 100) : 0,
    reviewedProgress: cards.length ? Math.round((counts.reviewed / cards.length) * 100) : 0
  }
}

const getRecommendation = (insights) => {
  if (insights.struggling > 0) return `${insights.struggling} struggling card${insights.struggling === 1 ? '' : 's'} need attention`
  if (insights.stale > 0) return `${insights.stale} card${insights.stale === 1 ? '' : 's'} have gone stale`
  if (insights.new > 0) return `${insights.new} new card${insights.new === 1 ? '' : 's'} ready to learn`
  if (insights.learning > 0) return `${insights.learning} learning card${insights.learning === 1 ? '' : 's'} to reinforce`
  return 'Keep your mastered cards fresh'
}

export function StatsPage() {
  const { decks, setActiveDeck } = useContext(AppContext)
  const navigate = useNavigate()
  const baseStyles = useStyle()
  const styles = {
    ...baseStyles,
    stats: {
      container: 'p-4 pb-5 md:pb-4',
      header: 'mb-6',
      emptyState: 'flex flex-col items-center justify-center min-h-96 p-8 text-center'
    }
  }

  const deckInsights = decks
    .map(deck => ({ deck, insights: getDeckInsights(deck) }))
    .sort((a, b) => b.insights.priority - a.insights.priority)

  const startStudying = (deck) => {
    setActiveDeck(deck)
    navigate('/review')
  }

  return (
    <div className={styles.stats.container}>
      <div className={styles.stats.header}>
        <h1 className="text-2xl font-bold text-gray-900">Study Insights</h1>
        <p className="text-sm text-gray-600">Prioritize the decks and cards that need practice most.</p>
      </div>

      {deckInsights.length > 0 ? (
        <div className="space-y-3">
          {deckInsights.map(({ deck, insights }) => (
            <section key={deck.id} className="bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{deck.name}</h3>
                  <p className="mt-1 text-sm text-orange-600">{getRecommendation(insights)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => startStudying(deck)}
                  className="self-start rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 flex items-center gap-2"
                >
                  <FaPlay /> Study
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-amber-50 p-2">
                  <div className="text-lg font-bold text-amber-700">{insights.new}</div>
                  <div className="text-xs text-amber-700">New</div>
                </div>
                <div className="rounded-lg bg-red-50 p-2">
                  <div className="text-lg font-bold text-red-700">{insights.struggling}</div>
                  <div className="text-xs text-red-700">Struggling</div>
                </div>
                <div className="rounded-lg bg-blue-50 p-2">
                  <div className="text-lg font-bold text-blue-700">{insights.learning}</div>
                  <div className="text-xs text-blue-700">Learning</div>
                </div>
                <div className="rounded-lg bg-green-50 p-2">
                  <div className="text-lg font-bold text-green-700">{insights.mastered}</div>
                  <div className="text-xs text-green-700">Mastered</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>{insights.reviewed}/{insights.total} reviewed at least once</span>
                  <span>{insights.reviewedProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${insights.reviewedProgress}%` }} />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 text-right text-xs text-gray-500">{insights.progress}% mastered</div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-yellow-400 transition-all" style={{ width: `${insights.progress}%` }} />
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.stats.emptyState}>
          <div className="mb-4 text-6xl text-gray-400"><FaExclamationTriangle /></div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">No decks yet</h2>
          <p className="text-gray-600">Create or import a deck to see useful study recommendations.</p>
        </div>
      )}
    </div>
  )
}
