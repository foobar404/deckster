import './Stats.css'

const Stats = ({ stats, decks }) => {
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
    <div className="stats">
      <div className="header">
        <h1>Statistics</h1>
        <p>Track your learning progress</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass rounded-lg">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalReviews}</div>
            <div className="stat-label">Total Reviews</div>
          </div>
        </div>

        <div className="stat-card glass rounded-lg">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{accuracy}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
        </div>

        <div className="stat-card glass rounded-lg">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.streakCount}</div>
            <div className="stat-label">Current Streak</div>
          </div>
        </div>

        <div className="stat-card glass rounded-lg">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <div className="stat-value">{totalCards}</div>
            <div className="stat-label">Total Cards</div>
          </div>
        </div>

        <div className="stat-card glass rounded-lg">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{reviewedCards}</div>
            <div className="stat-label">Cards Reviewed</div>
          </div>
        </div>

        <div className="stat-card glass rounded-lg">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-value">{masteredCards}</div>
            <div className="stat-label">Cards Mastered</div>
          </div>
        </div>
      </div>

      {deckProgress.length > 0 && (
        <div className="deck-progress-section">
          <h2>Deck Progress</h2>
          <div className="deck-progress-list">
            {deckProgress.map((deck, index) => (
              <div key={index} className="deck-progress-item glass rounded-lg">
                <div className="deck-info">
                  <h3 className="deck-name">{deck.name}</h3>
                  <div className="deck-stats">
                    <span>{deck.reviewed}/{deck.total} reviewed</span>
                    <span>{deck.mastered} mastered</span>
                  </div>
                </div>
                <div className="progress-visual">
                  <div className="progress-circle">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                      <path
                        className="circle-bg"
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="circle-progress"
                        strokeDasharray={`${deck.progress}, 100`}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="progress-text">{deck.progress}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalReviews > 0 && (
        <div className="performance-section glass rounded-lg">
          <h2>Performance Breakdown</h2>
          <div className="performance-chart">
            <div className="chart-bar">
              <div className="bar-label">Correct</div>
              <div className="bar-container">
                <div 
                  className="bar-fill correct"
                  style={{ width: `${(stats.correct / stats.totalReviews) * 100}%` }}
                ></div>
              </div>
              <div className="bar-value">{stats.correct}</div>
            </div>
            <div className="chart-bar">
              <div className="bar-label">Incorrect</div>
              <div className="bar-container">
                <div 
                  className="bar-fill incorrect"
                  style={{ width: `${(stats.incorrect / stats.totalReviews) * 100}%` }}
                ></div>
              </div>
              <div className="bar-value">{stats.incorrect}</div>
            </div>
          </div>
        </div>
      )}

      {stats.totalReviews === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <h2>No Data Yet</h2>
          <p>Start reviewing cards to see your statistics!</p>
        </div>
      )}
    </div>
  )
}

export default Stats
