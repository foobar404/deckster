import { useState, useEffect, useCallback } from 'react'
import FlashCard from './FlashCard'
import styles from './Review.module.css'
import { FaBook, FaTrophy } from 'react-icons/fa'

const Review = ({ deck, onUpdateStats, onCardReviewed }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 })
  const [dragState, setDragState] = useState({
    isFlipped: false,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    selectedAnswer: null
  })

  const handleCardReview = (difficulty) => {
    if (!deck || !deck.cards) return

    const currentCard = deck.cards[currentCardIndex]
    onCardReviewed(currentCard.id, difficulty)
    
    // Update session stats
    const isCorrect = difficulty >= 2 // 'Easy' or 'Again' (0,1) vs 'Good', 'Easy' (2,3)
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }))

    // Update global stats
    onUpdateStats(prev => ({
      ...prev,
      totalReviews: prev.totalReviews + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      streakCount: isCorrect ? prev.streakCount + 1 : 0
    }))

    // Move to next card
    if (currentCardIndex < deck.cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
    } else {
      setShowResult(true)
    }
  }

  const resetSession = () => {
    setCurrentCardIndex(0)
    setShowResult(false)
    setSessionStats({ correct: 0, total: 0 })
  }

  const handleDragStateChange = useCallback((newDragState) => {
    setDragState(newDragState)
  }, [])

  if (!deck || !deck.cards || deck.cards.length === 0) {
    return (
      <div className={styles.reviewContainer}>
        <div className={`${styles.emptyState} glass rounded-lg`}>
          <div className={styles.emptyIcon}><FaBook /></div>
          <h2>No Deck Selected</h2>
          <p>Choose a deck from the Decks tab to start reviewing.</p>
        </div>
      </div>
    )
  }

  if (showResult) {
    const accuracy = Math.round((sessionStats.correct / sessionStats.total) * 100)
    return (
      <div className={styles.reviewContainer}>
        <div className={`${styles.sessionComplete} glass rounded-lg`}>
          <div className={styles.completeIcon}><FaTrophy /></div>
          <h2>Session Complete!</h2>
          <div className={styles.sessionStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{sessionStats.total}</span>
              <span className={styles.statLabel}>Cards Reviewed</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{accuracy}%</span>
              <span className={styles.statLabel}>Accuracy</span>
            </div>
          </div>
          <button className="btn-primary" onClick={resetSession}>
            Review Again
          </button>
        </div>
      </div>
    )
  }

  const currentCard = deck.cards[currentCardIndex]
  const progress = ((currentCardIndex + 1) / deck.cards.length) * 100

  return (
    <div className={styles.reviewContainer}>
      {/* Quadrant indicators when card is flipped */}
      {dragState.isFlipped && (
        <div className={styles.quadrants}>
          <div className={`${styles.quadrant} ${styles.tl} ${dragState.isDragging && dragState.dragOffset.x < -30 && dragState.dragOffset.y < -30 ? styles.active : ''}`}>
          </div>
          <div className={`${styles.quadrant} ${styles.tr} ${dragState.isDragging && dragState.dragOffset.x > 30 && dragState.dragOffset.y < -30 ? styles.active : ''}`}>
          </div>
          <div className={`${styles.quadrant} ${styles.bl} ${dragState.isDragging && dragState.dragOffset.x < -30 && dragState.dragOffset.y > 30 ? styles.active : ''}`}>
          </div>
          <div className={`${styles.quadrant} ${styles.br} ${dragState.isDragging && dragState.dragOffset.x > 30 && dragState.dragOffset.y > 30 ? styles.active : ''}`}>
          </div>
        </div>
      )}

      <div className={styles.reviewHeader}>
        <h1 className={styles.deckTitle}>{deck.name}</h1>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className={styles.cardCounter}>
          {currentCardIndex + 1} of {deck.cards.length}
        </div>
      </div>

      <div className={styles.cardStack}>
        <FlashCard 
          card={currentCard}
          onReview={handleCardReview}
          onDragStateChange={handleDragStateChange}
        />
      </div>
    </div>
  )
}

export default Review
