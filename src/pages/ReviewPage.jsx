import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { useStyle, useStorage } from '../utils'
import { FlashCard } from '../components/FlashCard'
import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import { FaBook, FaTrophy, FaExclamationTriangle, FaRedo } from 'react-icons/fa'

/**
 * Custom hook for ReviewPage logic and state management
 * @returns {Object} All state and handlers needed by the ReviewPage component
 */
const useReviewPage = () => {
  const navigate = useNavigate()
  const { activeDeck, decks, setDecks, setActiveDeck, setReviewStats, studyOptions } = useContext(AppContext)
  const { showInfo } = useToast()
  const { saveToStorage, loadFromStorage, clearFromStorage, STORAGE_KEYS } = useStorage()
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 })
  const [studyCards, setStudyCards] = useState([])
  const [originalStudyCards, setOriginalStudyCards] = useState([]) // Store the original subset for "Review Again"
  const [dragState, setDragState] = useState({
    isFlipped: false,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    selectedAnswer: null
  })
  // When we trigger a programmatic reset we want to avoid immediately re-loading saved state
  const ignoreLoadRef = useRef(false)

  // Save review state to localStorage
  const saveReviewState = useCallback(() => {
    if (activeDeck && studyCards.length > 0) {
      const reviewState = {
        deckId: activeDeck.id,
        currentCardIndex,
        showResult,
        sessionStats,
        studyCards,
        originalStudyCards,
        timestamp: Date.now()
      }

      saveToStorage('deckster_review_state', reviewState)
    } else {

    }
  }, [activeDeck, currentCardIndex, showResult, sessionStats, studyCards, originalStudyCards])

  // Load review state from localStorage
  const loadReviewState = useCallback(() => {
    if (ignoreLoadRef.current) {
      return false
    }
    const reviewState = loadFromStorage('deckster_review_state')

    if (reviewState) {
      // Only restore if it's for the same deck and recent (within 24 hours)
      if (reviewState.deckId === activeDeck?.id &&
        Date.now() - reviewState.timestamp < 24 * 60 * 60 * 1000) {

        setCurrentCardIndex(reviewState.currentCardIndex)
        setShowResult(reviewState.showResult)
        setSessionStats(reviewState.sessionStats)
        setStudyCards(reviewState.studyCards)
        setOriginalStudyCards(reviewState.originalStudyCards || reviewState.studyCards)
        return true
      }
    }
    return false
  }, [activeDeck])

  // Clear review state
  const clearReviewState = useCallback(() => {
    clearFromStorage('deckster_review_state')
  }, [])

  // Prepare study cards based on options (moved into hook so resetSession can reuse it)
  const prepareStudyCards = useCallback((deck, options) => {
    if (!deck || !deck.cards || deck.cards.length === 0) return []
    let cards = [...deck.cards]

    if (options?.onlyMissed) {
      cards = cards.filter(card => card.difficulty < 2)
      if (cards.length === 0) return deck.cards
    }

    const studyCards = cards.map(card => {
      let direction = options?.direction
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

    if (options?.randomOrder) {
      for (let i = studyCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        ;[studyCards[i], studyCards[j]] = [studyCards[j], studyCards[i]]
      }
    }

    // Apply card limit if specified
    if (options?.cardLimit && options.cardLimit > 0) {
      return studyCards.slice(0, options.cardLimit)
    }

    return studyCards
  }, [])

  // Reshuffle existing study cards for "Review Again" functionality
  const reshuffleStudyCards = useCallback((cards, options) => {
    if (!cards || cards.length === 0) return cards
    
    let shuffledCards = [...cards]
    
    // Only shuffle if randomOrder is enabled
    if (options?.randomOrder) {
      for (let i = shuffledCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        ;[shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]]
      }
    }
    
    return shuffledCards
  }, [])

  // Reset the current review session. We set ignoreLoadRef so any load effect
  // triggered by this action won't immediately restore the previous saved state.
  const resetSession = useCallback((forceNewSubset = false) => {

    ignoreLoadRef.current = true
    // Clear persisted state
    clearFromStorage('deckster_review_state')

    // Reset in-memory state
    if (!forceNewSubset && originalStudyCards.length > 0) {
      // Use existing subset, just reshuffle
      const shuffledCards = reshuffleStudyCards(originalStudyCards, studyOptions)
      setStudyCards(shuffledCards)
    } else {
      // Create new subset
      const cards = prepareStudyCards(activeDeck, studyOptions)
      setStudyCards(cards)
      setOriginalStudyCards(cards) // Store the new subset as original
    }
    
    setCurrentCardIndex(0)
    setShowResult(false)
    setSessionStats({ correct: 0, total: 0 })

    // Allow loads again after a short tick so other effects can run
    setTimeout(() => { ignoreLoadRef.current = false }, 200)
  }, [activeDeck, prepareStudyCards, reshuffleStudyCards, originalStudyCards, studyOptions, clearFromStorage])

  // Initialize study cards when deck changes
  useEffect(() => {
    if (activeDeck) {
      // Try to load saved review state first
      const stateLoaded = loadReviewState()

      if (!stateLoaded) {
        // No saved state, start fresh
        const cards = prepareStudyCards(activeDeck, studyOptions)

        setStudyCards(cards)
        setOriginalStudyCards(cards) // Store original subset for "Review Again"
        setCurrentCardIndex(0)
        setShowResult(false)
        setSessionStats({ correct: 0, total: 0 })
      }
    }
  }, [activeDeck, prepareStudyCards, loadReviewState, studyOptions])

  return {
    navigate,
    activeDeck,
    decks,
    setDecks,
    setActiveDeck,
    setReviewStats,
    studyOptions,
    showInfo,
    resetSession,
    currentCardIndex,
    setCurrentCardIndex,
    showResult,
    setShowResult,
    sessionStats,
    setSessionStats,
    studyCards,
    setStudyCards,
    dragState,
    setDragState,
    saveReviewState,
    loadReviewState,
    clearReviewState
  }
}

export function ReviewPage() {
  const {
    navigate,
    activeDeck,
    decks,
    setDecks,
    setActiveDeck,
    setReviewStats,
    studyOptions,
    showInfo,
    resetSession,
    currentCardIndex,
    setCurrentCardIndex,
    showResult,
    setShowResult,
    sessionStats,
    setSessionStats,
    studyCards,
    setStudyCards,
    dragState,
    setDragState,
    saveReviewState,
    loadReviewState,
    clearReviewState
  } = useReviewPage()

  // Custom styles for ReviewPage
  const customStyles = {
    container: 'h-full flex flex-col p-2 sm:p-4',
    emptyState: 'flex flex-col items-center justify-center min-h-96 p-6 text-center',
    emptyIcon: 'text-5xl text-gray-400 mb-3',
    // Tighten header spacing and ensure it stacks above the card
    header: 'relative z-20 flex flex-col gap-2 p-3 bg-white border-b border-gray-200 rounded-lg shadow-sm mb-2',
    headerInner: 'flex items-center gap-4',
    headerText: 'text-center text-sm text-gray-600',
    progressBar: 'w-full bg-gray-200 rounded-full h-2',
    progressFill: 'bg-blue-500 h-2 rounded-full transition-all duration-300',
    // Card visual style available to the page: translucent background + 10px solid border
    card: 'bg-white/30 border-[10px] border-gray-200/50 border-solid rounded-2xl p-4',
    // Allow the card stack to flex and shrink without producing vertical scroll, less padding on mobile
    cardStack: 'flex-1 flex items-center justify-center p-1 sm:p-3 min-h-0',
    // Panel styles used for empty/result states
    panel: 'flex flex-col items-center justify-center p-6 text-center',
    panelLarge: 'flex flex-col items-center justify-center bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg p-8 text-center',
    // Buttons
    resetButton: 'p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors duration-200 flex justify-center items-center',
    backButton: 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
    resultButton: 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
    // Quadrant overlays
    quadContainer: 'fixed inset-0 pointer-events-none z-0',
    quadTopLeft: 'absolute top-0 left-0 w-1/2 h-1/2 border-2 border-dashed border-transparent bg-red-500/10 transition-colors duration-200',
    quadTopLeftActive: 'border-red-500 bg-red-500/40',
    quadTopRight: 'absolute top-0 right-0 w-1/2 h-1/2 border-2 border-dashed border-transparent bg-indigo-500/10 transition-colors duration-200',
    quadTopRightActive: 'border-indigo-500 bg-indigo-500/40',
    quadBottomLeft: 'absolute bottom-0 left-0 w-1/2 h-1/2 border-2 border-dashed border-transparent bg-orange-500/10 transition-colors duration-200',
    quadBottomLeftActive: 'border-orange-500 bg-orange-500/40',
    quadBottomRight: 'absolute bottom-0 right-0 w-1/2 h-1/2 border-2 border-dashed border-transparent bg-green-500/10 transition-colors duration-200',
    quadBottomRightActive: 'border-green-500 bg-green-500/40',
    // Card wrapper: wider on mobile, more constrained on desktop
    cardWrapper: 'w-full max-w-none sm:max-w-xl lg:max-w-2xl mx-auto h-full max-h-[80vh] flex items-center justify-center relative z-10',
    // Result panel specifics
    resultIcon: 'text-6xl text-yellow-500 mb-4',
    resultTitle: 'text-2xl font-bold text-gray-900 mb-6',
    resultRow: 'flex gap-8 mb-8',
    resultStat: 'text-center',
    resultNumber: 'block text-3xl font-bold text-blue-600',
    resultLabel: 'text-sm text-gray-600',
    resultNumberAccent: 'block text-3xl font-bold text-green-600'
  }

  // Small status badges
  customStyles.statusHighlight = 'text-orange-600 font-medium'
  customStyles.statusBlue = 'text-blue-600 font-medium'

  const baseStyles = useStyle()
  const styles = { ...baseStyles, review: customStyles }

  // Save review state whenever it changes
  useEffect(() => {
    saveReviewState()
  }, [currentCardIndex, showResult, sessionStats, studyCards, saveReviewState])

  // Save state when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      // Save current state before unmounting
      if (activeDeck && studyCards.length > 0 && !showResult) {
        // Use the hook-provided saver to persist review state
        saveReviewState()
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

  // resetSession provided by useReviewPage hook is used instead (contains ignoreLoadRef logic)

  const handleDragStateChange = useCallback((newDragState) => {
    setDragState(newDragState)
  }, [])

  if (!activeDeck || !activeDeck.cards || activeDeck.cards.length === 0) {
    return (
      <div className={styles.review.container}>
        <h1 className="w-full text-left text-2xl font-bold text-gray-900 mb-2">Review</h1>
        <p className="w-full text-left text-gray-600 mb-6">Start a study session by selecting a deck from the Decks page.</p>
        <div className={styles.review.panel}>
          <div className={styles.review.emptyIcon}><FaBook /></div>
          <h2>No Deck Selected</h2>
        </div>
      </div>
    )
  }

  if (studyCards.length === 0) {
    return (
      <div className={styles.review.container}>
        <div className={styles.review.panel}>
          <div className={styles.review.emptyIcon}><FaExclamationTriangle /></div>
          <h2>No Cards to Study</h2>
          <p>All cards have been mastered! Try different study options from the main deck page.</p>
          <button className={styles.review.backButton} onClick={() => navigate('/')}>
            Back to Decks
          </button>
        </div>
      </div>
    )
  }

  if (showResult) {
    const accuracy = Math.round((sessionStats.correct / sessionStats.total) * 100)
    return (
      <div className={styles.review.container}>
        <div className={styles.review.panelLarge}>
          <div className={styles.review.resultIcon}><FaTrophy /></div>
          <h2 className={styles.review.resultTitle}>Session Complete!</h2>
          <div className={styles.review.resultRow}>
            <div className={styles.review.resultStat}>
              <span className={styles.review.resultNumber}>{sessionStats.total}</span>
              <span className={styles.review.resultLabel}>Cards Reviewed</span>
            </div>
            <div className={styles.review.resultStat}>
              <span className={styles.review.resultNumberAccent}>{accuracy}%</span>
              <span className={styles.review.resultLabel}>Accuracy</span>
            </div>
          </div>
          <div>
            <button className={styles.review.resultButton} onClick={() => resetSession()}>
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
    <div className={styles.review.container}>
      {/* Quadrant indicators when card is flipped */}
      {dragState.isFlipped && (
        // Place quadrant overlays behind the card so they are visible through translucent card backgrounds
        <div className={styles.review.quadContainer}>
          {/* All quadrants show a faint color by default; dragging intensifies border/opacity */}
          <div className={`${styles.review.quadTopLeft} ${dragState.isDragging && dragState.dragOffset.x < -30 && dragState.dragOffset.y < -30 ? styles.review.quadTopLeftActive : ''}`} />
          <div className={`${styles.review.quadTopRight} ${dragState.isDragging && dragState.dragOffset.x > 30 && dragState.dragOffset.y < -30 ? styles.review.quadTopRightActive : ''}`} />
          <div className={`${styles.review.quadBottomLeft} ${dragState.isDragging && dragState.dragOffset.x < -30 && dragState.dragOffset.y > 30 ? styles.review.quadBottomLeftActive : ''}`} />
          <div className={`${styles.review.quadBottomRight} ${dragState.isDragging && dragState.dragOffset.x > 30 && dragState.dragOffset.y > 30 ? styles.review.quadBottomRightActive : ''}`} />
        </div>
      )}

      <div className={styles.review.header}>
        <div className={styles.review.headerInner}>
          <div className={styles.review.progressBar}>
            <div
              className={styles.review.progressFill}
              style={{ width: `${progress}%` }}
              key={`progress-${currentCardIndex}`}
            ></div>
          </div>
          <button
            type="button"
            className={styles.review.resetButton}
            onClick={(e) => { e.stopPropagation(); resetSession(true); }}
            title="Reset session"
          >
            <FaRedo />
          </button>
        </div>
        <div className={styles.review.headerText}>
          {currentCardIndex + 1} of {studyCards.length}
        </div>
      </div>

      <div className={styles.review.cardStack}>
        {/* Constrain the card area so header + card + controls fit on one screen */}
        <div className={styles.review.cardWrapper}>
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
    </div>
  )
}


