import { useContext } from 'react'
import { AppContext } from '../context/AppContext'
import styles from '../components/Stats.module.css'
import { FaChartBar, FaBullseye, FaFire, FaBook, FaCheckCircle, FaTrophy, FaChartLine } from 'react-icons/fa'

const StatsPage = () => {
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

  return (
    <div className={styles.stats}>
      <div className={styles.header}>
        <h1>Statistics</h1>
        <p>Track your learning progress</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass rounded-lg`}>
          <div className={styles.statIcon}><FaChartBar /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalReviews}</div>
            <div className={styles.statLabel}>Total Reviews</div>
          </div>
        </div>

        <div className={`${styles.statCard} glass rounded-lg`}>
          <div className={styles.statIcon}><FaBullseye /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{accuracy}%</div>
            <div className={styles.statLabel}>Accuracy</div>
          </div>
        </div>

        <div className={`${styles.statCard} glass rounded-lg`}>
          <div className={styles.statIcon}><FaFire /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.streakCount}</div>
            <div className={styles.statLabel}>Current Streak</div>
          </div>
        </div>

        <div className={`${styles.statCard} glass rounded-lg`}>
          <div className={styles.statIcon}><FaBook /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalCards}</div>
            <div className={styles.statLabel}>Total Cards</div>
          </div>
        </div>

        <div className={`${styles.statCard} glass rounded-lg`}>
          <div className={styles.statIcon}><FaCheckCircle /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{reviewedCards}</div>
            <div className={styles.statLabel}>Cards Reviewed</div>
          </div>
        </div>

        <div className={`${styles.statCard} glass rounded-lg`}>
          <div className={styles.statIcon}><FaTrophy /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{masteredCards}</div>
            <div className={styles.statLabel}>Cards Mastered</div>
          </div>
        </div>
      </div>

      {deckProgress.length > 0 && (
        <div className={styles.deckProgressSection}>
          <h2>Deck Progress</h2>
          <div className={styles.deckProgressList}>
            {deckProgress.map((deck, index) => (
              <div key={index} className={`${styles.deckProgressItem} glass rounded-lg`}>
                <div className={styles.deckInfo}>
                  <h3 className={styles.deckName}>{deck.name}</h3>
                  <div className={styles.deckStats}>
                    <span>{deck.reviewed}/{deck.total} reviewed</span>
                    <span>{deck.mastered} mastered</span>
                  </div>
                </div>
                <div className={styles.progressVisual}>
                  <div className={styles.progressCircle}>
                    <svg viewBox="0 0 36 36" className={styles.circularChart}>
                      <path
                        className={styles.circleBg}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={styles.circleProgress}
                        strokeDasharray={`${deck.progress}, 100`}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className={styles.progressText}>{deck.progress}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalReviews > 0 && (
        <div className={`${styles.performanceSection} glass rounded-lg`}>
          <h2>Performance Breakdown</h2>
          <div className={styles.performanceChart}>
            <div className={styles.chartBar}>
              <div className={styles.barLabel}>Correct</div>
              <div className={styles.barContainer}>
                <div 
                  className={`${styles.barFill} ${styles.correct}`}
                  style={{ width: `${(stats.correct / stats.totalReviews) * 100}%` }}
                ></div>
              </div>
              <div className={styles.barValue}>{stats.correct}</div>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.barLabel}>Incorrect</div>
              <div className={styles.barContainer}>
                <div 
                  className={`${styles.barFill} ${styles.incorrect}`}
                  style={{ width: `${(stats.incorrect / stats.totalReviews) * 100}%` }}
                ></div>
              </div>
              <div className={styles.barValue}>{stats.incorrect}</div>
            </div>
          </div>
        </div>
      )}

      {stats.totalReviews === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><FaChartLine /></div>
          <h2>No Data Yet</h2>
          <p>Start reviewing cards to see your statistics!</p>
        </div>
      )}
    </div>
  )
}

export default StatsPage
