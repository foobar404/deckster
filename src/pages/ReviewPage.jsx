import { useState, useEffect, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import FlashCard from '../components/FlashCard'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { FaBook, FaTrophy, FaExclamationTriangle } from 'react-icons/fa'
import styles from '../components/Review.module.css'

const ReviewPage = () => {
  const navigate = useNavigate()
  const { activeDeck, decks, setDecks, setActiveDeck, setReviewStats, studyOptions } = useContext(AppContext)
  const { showInfo } = useToast()
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 })
  const [studyCards, setStudyCards] = useState([])
  const [dragState, setDragState] = useState({
    isFlipped: false,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    selectedAnswer: null
  })

  // Save review state to localStorage
  const saveReviewState = useCallback(() => {
    if (activeDeck && studyCards.length > 0) {
      const reviewState = {
        deckId: activeDeck.id,
        currentCardIndex,
        showResult,
        sessionStats,
        studyCards,
        timestamp: Date.now()
      }
      localStorage.setItem('deckster_review_state', JSON.stringify(reviewState))
    }
  }, [activeDeck, currentCardIndex, showResult, sessionStats, studyCards])

  // Load review state from localStorage
  const loadReviewState = useCallback(() => {
    const savedState = localStorage.getItem('deckster_review_state')
    if (savedState) {
      try {
        const reviewState = JSON.parse(savedState)
        // Only restore if it's for the same deck and recent (within 24 hours)
        if (reviewState.deckId === activeDeck?.id && 
            Date.now() - reviewState.timestamp < 24 * 60 * 60 * 1000) {
          setCurrentCardIndex(reviewState.currentCardIndex)
          setShowResult(reviewState.showResult)
          setSessionStats(reviewState.sessionStats)
          setStudyCards(reviewState.studyCards)
          return true
        }
      } catch (error) {
        console.error('Error loading review state:', error)
      }
    }
    return false
  }, [activeDeck])

  // Clear review state
  const clearReviewState = useCallback(() => {
    localStorage.removeItem('deckster_review_state')
  }, [])

  // Prepare study cards based on options
  const prepareStudyCards = useCallback((deck, options) => {
    if (!deck || !deck.cards || deck.cards.length === 0) return []
    
    let cards = [...deck.cards]
    
    // Filter for missed cards only
    if (options.onlyMissed) {
      cards = cards.filter(card => card.difficulty < 2) // Cards with difficulty 0 or 1
      if (cards.length === 0) {
        // Don't show toast during callback, just fallback
        return deck.cards // Fallback to all cards
      }
    }
    
    // Create card objects with direction
    const studyCards = cards.map(card => {
      let direction = options.direction
      if (direction === 'random') {
        direction = Math.random() < 0.5 ? 'front-to-back' : 'back-to-front'
      }
      
      return {
        ...card,
        studyDirection: direction,
        displayFront: direction === 'front-to-back' ? card.front : card.back,
        displayBack: direction === 'front-to-back' ? card.back : card.front,
        displayFrontImage: direction === 'front-to-back' ? card.frontImageUrl : card.backImageUrl || card.imageUrl,
        displayBackImage: direction === 'front-to-back' ? card.backImageUrl || card.imageUrl : card.frontImageUrl
      }
    })
    
    // Shuffle if random order
    if (options.randomOrder) {
      for (let i = studyCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [studyCards[i], studyCards[j]] = [studyCards[j], studyCards[i]]
      }
    }
    
    return studyCards
  }, []) // Removed showInfo dependency

  // Initialize study cards when deck changes
  useEffect(() => {
    if (activeDeck) {
      // Try to load saved review state first
      const stateLoaded = loadReviewState()
      
      if (!stateLoaded) {
        // No saved state, start fresh
        const cards = prepareStudyCards(activeDeck, studyOptions)
        setStudyCards(cards)
        setCurrentCardIndex(0)
        setShowResult(false)
        setSessionStats({ correct: 0, total: 0 })
      }
    }
  }, [activeDeck, prepareStudyCards, loadReviewState])

  // Save review state whenever it changes
  useEffect(() => {
    saveReviewState()
  }, [currentCardIndex, showResult, sessionStats, studyCards, saveReviewState])

  // Save state when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      // Save current state before unmounting
      if (activeDeck && studyCards.length > 0 && !showResult) {
        const reviewState = {
          deckId: activeDeck.id,
          currentCardIndex,
          showResult,
          sessionStats,
          studyCards,
          timestamp: Date.now()
        }
        localStorage.setItem('deckster_review_state', JSON.stringify(reviewState))
      }
    }
  }, [activeDeck, currentCardIndex, showResult, sessionStats, studyCards])

  const handleCardReview = (difficulty) => {
    if (!activeDeck || !studyCards || studyCards.length === 0) return

    const currentCard = studyCards[currentCardIndex]
    
    // Update card difficulty and last reviewed date
    const updatedDecks = decks.map(deck => 
      deck.id === activeDeck.id 
        ? {
            ...deck,
            cards: deck.cards.map(card =>
              card.id === currentCard.id
                ? { ...card, difficulty, lastReviewed: new Date().toISOString() }
                : card
            )
          }
        : deck
    )
    setDecks(updatedDecks)
    
    // Don't update activeDeck during review session to avoid triggering useEffect
    // The activeDeck will be updated when navigating away and back
    
    // Update session stats
    const isCorrect = difficulty >= 2 // 'Easy' or 'Again' (0,1) vs 'Good', 'Easy' (2,3)
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }))

    // Update global stats
    setReviewStats(prev => ({
      ...prev,
      totalReviews: prev.totalReviews + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      streakCount: isCorrect ? prev.streakCount + 1 : 0
    }))

    // Move to next card
    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
    } else {
      setShowResult(true)
    }
  }

  const resetSession = () => {
    // Clear saved review state
    clearReviewState()
    
    // Update activeDeck with latest changes from decks
    const updatedActiveDeck = decks.find(deck => deck.id === activeDeck?.id)
    if (updatedActiveDeck) {
      setActiveDeck(updatedActiveDeck)
    }
    
    setCurrentCardIndex(0)
    setShowResult(false)
    setSessionStats({ correct: 0, total: 0 })
    // Regenerate study cards with current options (for shuffle or other option changes)
    if (activeDeck) {
      const cards = prepareStudyCards(activeDeck, studyOptions)
      setStudyCards(cards)
    }
  }

  const handleDragStateChange = useCallback((newDragState) => {
    setDragState(newDragState)
  }, [])

  if (!activeDeck || !activeDeck.cards || activeDeck.cards.length === 0) {
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

  if (studyCards.length === 0) {
    return (
      <div className={styles.reviewContainer}>
        <div className={`${styles.emptyState} glass rounded-lg`}>
          <div className={styles.emptyIcon}><FaExclamationTriangle /></div>
          <h2>No Cards to Study</h2>
          <p>All cards have been mastered! Try different study options from the main deck page.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Back to Decks
          </button>
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
          <div className={styles.sessionActions}>
            <button className="btn-primary" onClick={resetSession}>
              Review Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentCard = studyCards[currentCardIndex]
  const progress = ((currentCardIndex + 1) / studyCards.length) * 100

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
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress}%` }}
            key={`progress-${currentCardIndex}`}
          ></div>
        </div>
        <div className={styles.cardCounter}>
          {currentCardIndex + 1} of {studyCards.length}
          {studyOptions.onlyMissed && <span className={styles.modeIndicator}> (Missed Cards)</span>}
          {studyOptions.direction !== 'front-to-back' && <span className={styles.modeIndicator}> ({
            studyOptions.direction === 'back-to-front' ? 'Back→Front' : 'Random Direction'
          })</span>}
        </div>
      </div>

      <div className={styles.cardStack}>
        <FlashCard 
          card={{
            ...currentCard,
            front: currentCard.displayFront,
            back: currentCard.displayBack,
            frontImageUrl: currentCard.displayFrontImage,
            backImageUrl: currentCard.displayBackImage,
            imageUrl: currentCard.displayBackImage // Backward compatibility
          }}
          onReview={handleCardReview}
          onDragStateChange={handleDragStateChange}
          studyOptions={studyOptions}
        />
      </div>
    </div>
  )
}

export default ReviewPage
