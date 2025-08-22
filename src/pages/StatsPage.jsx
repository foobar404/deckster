import { useStyle } from '../utils'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { FaChartBar, FaBullseye, FaFire, FaBook, FaCheckCircle, FaTrophy, FaChartLine } from 'react-icons/fa'

/**
 * Custom hook for StatsPage logic and state management
 * @returns {Object} All data and calculations needed by the StatsPage component
 */
const useStatsPage = () => {
  const { reviewStats: stats, decks } = useContext(AppContext)

  const getTotalCards = () => {
    return decks.reduce((total, deck) => total + deck.cards.length, 0)
  }

  const getReviewedCards = () => {
    return decks.reduce((total, deck) => {
      return total + deck.cards.filter(card => card.lastReviewed).length
    }, 0)
  }

  const getMasteredCards = () => {
    return decks.reduce((total, deck) => {
      return total + deck.cards.filter(card => card.difficulty >= 3).length
    }, 0)
  }

  const getAccuracy = () => {
    if (stats.totalReviews === 0) return 0
    return Math.round((stats.correct / stats.totalReviews) * 100)
  }

  const getDeckProgress = () => {
    return decks.map(deck => {
      const total = deck.cards.length
      const reviewed = deck.cards.filter(card => card.lastReviewed).length
      const mastered = deck.cards.filter(card => card.difficulty >= 3).length
      const progress = total > 0 ? Math.round((reviewed / total) * 100) : 0

      return {
        name: deck.name,
        total,
        reviewed,
        mastered,
        progress
      }
    })
  }

  const totalCards = getTotalCards()
  const reviewedCards = getReviewedCards()
  const masteredCards = getMasteredCards()
  const accuracy = getAccuracy()
  const deckProgress = getDeckProgress()

  return {
    stats,
    totalCards,
    reviewedCards,
    masteredCards,
    accuracy,
    deckProgress
  }
}

export function StatsPage() {
  const {
    stats,
    totalCards,
    reviewedCards,
    masteredCards,
    accuracy,
    deckProgress
  } = useStatsPage()

  // Custom styles for StatsPage
  const customStyles = {
    container: 'p-4 pb-5 md:pb-4',
    header: 'mb-6',
    statsGrid: 'grid grid-cols-2 md:grid-cols-3 gap-4 mb-8',
    statCard: 'p-4 bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg flex items-center gap-4',
    statIcon: 'text-2xl text-blue-500',
    statValue: 'text-2xl font-bold text-gray-900',
    statLabel: 'text-sm text-gray-600',
    emptyState: 'flex flex-col items-center justify-center min-h-96 p-8 text-center'
  }

  const baseStyles = useStyle()
  const styles = { ...baseStyles, stats: { ...baseStyles.stats, ...customStyles } }

  return (
    <div className={styles.stats.container}>
      <div className={styles.stats.header}>
        <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
        <p className="text-gray-600">Track your learning progress</p>
      </div>

      <div className={styles.stats.statsGrid}>
        <div className={styles.stats.statCard}>
          <div className={styles.stats.statIcon}><FaChartBar /></div>
          <div>
            <div className={styles.stats.statValue}>{stats.totalReviews}</div>
            <div className={styles.stats.statLabel}>Total Reviews</div>
          </div>
        </div>

        <div className={styles.stats.statCard}>
          <div className={styles.stats.statIcon}><FaBullseye /></div>
          <div>
            <div className={styles.stats.statValue}>{accuracy}%</div>
            <div className={styles.stats.statLabel}>Accuracy</div>
          </div>
        </div>

        <div className={styles.stats.statCard}>
          <div className={styles.stats.statIcon}><FaFire /></div>
          <div>
            <div className={styles.stats.statValue}>{stats.streakCount}</div>
            <div className={styles.stats.statLabel}>Current Streak</div>
          </div>
        </div>

        <div className={styles.stats.statCard}>
          <div className={styles.stats.statIcon}><FaBook /></div>
          <div>
            <div className={styles.stats.statValue}>{totalCards}</div>
            <div className={styles.stats.statLabel}>Total Cards</div>
          </div>
        </div>

        <div className={styles.stats.statCard}>
          <div className={styles.stats.statIcon}><FaCheckCircle /></div>
          <div>
            <div className={styles.stats.statValue}>{reviewedCards}</div>
            <div className={styles.stats.statLabel}>Cards Reviewed</div>
          </div>
        </div>

        <div className={styles.stats.statCard}>
          <div className={styles.stats.statIcon}><FaTrophy /></div>
          <div>
            <div className={styles.stats.statValue}>{masteredCards}</div>
            <div className={styles.stats.statLabel}>Cards Mastered</div>
          </div>
        </div>
      </div>

      {deckProgress.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Deck Progress</h2>
          <div className="space-y-4">
            {deckProgress.map((deck, index) => (
              <div key={index} className="p-4 bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{deck.name}</h3>
                  <div className="text-sm text-gray-600">
                    <span>{deck.reviewed}/{deck.total} reviewed</span>
                    <span className="ml-3">{deck.mastered} mastered</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{deck.progress}%</div>
                  <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${deck.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalReviews > 0 && (
        <div className="p-6 bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Breakdown</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">Correct</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div
                  className="bg-green-500 h-6 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.correct / stats.totalReviews) * 100}%` }}
                ></div>
              </div>
              <div className="w-12 text-sm font-medium text-gray-900">{stats.correct}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600">Incorrect</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div
                  className="bg-red-500 h-6 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.incorrect / stats.totalReviews) * 100}%` }}
                ></div>
              </div>
              <div className="w-12 text-sm font-medium text-gray-900">{stats.incorrect}</div>
            </div>
          </div>
        </div>
      )}

      {stats.totalReviews === 0 && (
        <div className={styles.stats.emptyState}>
          <div className="text-6xl text-gray-400 mb-4"><FaChartLine /></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Yet</h2>
          <p className="text-gray-600">Start reviewing cards to see your statistics!</p>
        </div>
      )}
    </div>
  )
}


