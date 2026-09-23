import { useStyle } from '../utils'
import { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { CardStats } from '../components/CardStats'
import { FaExclamationTriangle, FaLayerGroup } from 'react-icons/fa'

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
    const isStruggling = (card.lapseCount || 0) > 0 || (card.lastResult ?? 3) < 2
    // Each card belongs to exactly one bucket so the four counts always add up to the deck total
    result[isStruggling ? 'struggling' : state] += 1
    if (card.lastReviewedAt || card.lastReviewed) result.reviewed += 1
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
  const { decks } = useContext(AppContext)
  const [selectedDeck, setSelectedDeck] = useState(null)
  const baseStyles = useStyle()
  const styles = {
    ...baseStyles,
    stats: {
      container: 'p-4 pb-5 md:pb-4 md:max-w-4xl md:mx-auto',
      header: 'mb-6',
      emptyState: 'flex flex-col items-center justify-center min-h-96 p-8 text-center'
    }
  }

  const deckInsights = decks
    .map(deck => ({ deck, insights: getDeckInsights(deck) }))
    .sort((a, b) => a.deck.name.localeCompare(b.deck.name, undefined, { sensitivity: 'base' }))

  if (selectedDeck) {
    return (
      <CardStats
        deck={decks.find(deck => deck.id === selectedDeck.id) || selectedDeck}
        onBack={() => setSelectedDeck(null)}
      />
    )
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
                  onClick={() => setSelectedDeck(deck)}
                  className="self-start rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 flex items-center gap-2"
                >
                  <FaLayerGroup /> View Cards
                </button>
              </div>

              <div className="mt-4">
                <div className="relative h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                  {/* rendered largest count first so smaller layers stay visible on top */}
                  {[
                    { key: 'new', label: 'New', count: insights.new, color: 'bg-gray-400' },
                    { key: 'struggling', label: 'Struggling', count: insights.struggling, color: 'bg-orange-400' },
                    { key: 'learning', label: 'Learning', count: insights.learning, color: 'bg-blue-500' },
                    { key: 'mastered', label: 'Mastered', count: insights.mastered, color: 'bg-green-500' }
                  ]
                    .sort((a, b) => b.count - a.count)
                    .map(layer => layer.count > 0 && (
                      <div
                        key={layer.key}
                        className={`absolute inset-y-0 left-0 rounded-full ${layer.color}`}
                        style={{ width: `${(layer.count / insights.total) * 100}%` }}
                      />
                    ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400" />New {insights.new}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" />Struggling {insights.struggling}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Learning {insights.learning}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />Mastered {insights.mastered}</span>
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
