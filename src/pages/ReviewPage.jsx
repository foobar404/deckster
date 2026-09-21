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
  const cramMetricsRef = useRef(new Map())
  const cramTurnRef = useRef(0)
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
    if (studyOptions.mode === 'cram') return

    if (activeDeck && studyCards.length > 0) {
      const reviewState = {
        deckId: activeDeck.id,
        mode: studyOptions.mode,
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
  }, [activeDeck, currentCardIndex, showResult, sessionStats, studyCards, originalStudyCards, studyOptions.mode])

  // Load review state from localStorage
  const loadReviewState = useCallback(() => {
    if (studyOptions.mode === 'cram') return false

    if (ignoreLoadRef.current) {
      return false
    }
    const reviewState = loadFromStorage('deckster_review_state')

    if (reviewState) {
      // Only restore if it's for the same deck and recent (within 24 hours)
      if (reviewState.deckId === activeDeck?.id &&
        (reviewState.mode || 'review') === (studyOptions.mode || 'review') &&
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
  }, [activeDeck, studyOptions.mode])

  // Clear review state
  const clearReviewState = useCallback(() => {
    clearFromStorage('deckster_review_state')
  }, [])

  const getCardStrength = useCallback((card) => {
    if (typeof card?.memoryStrength === 'number') return Math.max(0, Math.min(100, card.memoryStrength))
    if (typeof card?.difficulty === 'number') return Math.max(0, Math.min(100, card.difficulty))
    return 0
  }, [])

  const getCardState = useCallback((card) => {
    const strength = getCardStrength(card)
    if (card?.state) return card.state
    if (strength >= 80) return 'mastered'
    if (strength >= 55) return 'learning'
    return 'new'
  }, [getCardStrength])

  const getReviewPriority = useCallback((card) => {
    const strength = getCardStrength(card)
    const lastReviewedAt = card?.lastReviewedAt || card?.lastReviewed
    const hoursSinceLastReview = lastReviewedAt
      ? Math.max(0, (Date.now() - new Date(lastReviewedAt).getTime()) / (1000 * 60 * 60))
      : 48
    const lapseBoost = (card?.lapseCount || 0) * 18
    const streakPenalty = (card?.correctStreak || 0) * 6
    const stateBoost = getCardState(card) === 'mastered' ? -25 : getCardState(card) === 'learning' ? 8 : 16

    return (100 - strength) * 1.7 + Math.min(hoursSinceLastReview / 4, 24) + lapseBoost + stateBoost - streakPenalty
  }, [getCardState, getCardStrength])

  // Prepare study cards based on options (moved into hook so resetSession can reuse it)
  const prepareStudyCards = useCallback((deck, options) => {
    if (!deck || !deck.cards || deck.cards.length === 0) return []

    let cards = [...deck.cards]

    const statusFiltersActive = options?.onlyNew || options?.onlyLearning || options?.onlyMastered || options?.onlyMissed
    if (options?.mode !== 'cram' && statusFiltersActive) {
      cards = cards.filter(card => (
        (options.onlyNew && getCardState(card) === 'new') ||
        (options.onlyMissed && getCardStrength(card) < 60) ||
        (options.onlyLearning && getCardState(card) === 'learning') ||
        (options.onlyMastered && getCardState(card) === 'mastered')
      ))
    }
    if (options?.mode !== 'cram' && options?.recentlyWrong) {
      cards = cards.filter(card => (card.lapseCount || 0) > 0 || (card.lastResult ?? 3) < 2)
    }

    if (cards.length === 0) {
      cards = [...deck.cards]
    }

    if (options?.weakestFirst) {
      cards.sort((a, b) => getReviewPriority(b) - getReviewPriority(a))
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

    if (options?.mode !== 'cram' && options?.cardLimit && options.cardLimit > 0) {
      return studyCards.slice(0, options.cardLimit)
    }

    return studyCards
  }, [getCardState, getCardStrength, getReviewPriority])

  // Re-prioritize existing study cards for "Review Again" functionality
  const resortStudyCards = useCallback((cards, options) => {
    if (!cards || cards.length === 0) return cards

    const sortedCards = [...cards]

    if (options?.weakestFirst) {
      sortedCards.sort((a, b) => getReviewPriority(b) - getReviewPriority(a))
    }

    return sortedCards
  }, [getReviewPriority])

  // Reset the current review session. We set ignoreLoadRef so any load effect
  // triggered by this action won't immediately restore the previous saved state.
  const resetSession = useCallback((forceNewSubset = false) => {

    ignoreLoadRef.current = true
    cramMetricsRef.current = new Map()
    cramTurnRef.current = 0
    // Clear persisted state
    clearFromStorage('deckster_review_state')

    // Reset in-memory state
    if (!forceNewSubset && originalStudyCards.length > 0) {
      const prioritizedCards = resortStudyCards(originalStudyCards, studyOptions)
      setStudyCards(prioritizedCards)
    } else {
      // Create new subset using priority and filter logic
      const cards = prepareStudyCards(activeDeck, studyOptions)
      setStudyCards(cards)
      setOriginalStudyCards(cards) // Store the new subset as original
    }
    
    setCurrentCardIndex(0)
    setShowResult(false)
    setSessionStats({ correct: 0, total: 0 })

    // Allow loads again after a short tick so other effects can run
    setTimeout(() => { ignoreLoadRef.current = false }, 200)
  }, [activeDeck, prepareStudyCards, resortStudyCards, originalStudyCards, studyOptions, clearFromStorage])

  // Initialize study cards when deck changes
  useEffect(() => {
    cramMetricsRef.current = new Map()
    cramTurnRef.current = 0
  }, [activeDeck, studyOptions.mode])

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
    cramMetricsRef,
    cramTurnRef,
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
    cramMetricsRef,
    cramTurnRef,
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

  const getCardStrength = (card) => {
    if (typeof card?.memoryStrength === 'number') return Math.max(0, Math.min(100, card.memoryStrength))
    if (typeof card?.difficulty === 'number') return Math.max(0, Math.min(100, card.difficulty))
    return 0
  }

  const getCardState = (card) => {
    const strength = getCardStrength(card)
    if (card?.state) return card.state
    if (strength >= 80) return 'mastered'
    if (strength >= 55) return 'learning'
    return 'new'
  }

  const updateCardReviewState = (card, rating) => {
    const adjustmentMap = {
      0: -30,
      1: -10,
      2: 15,
      3: 35
    }

    const currentStrength = getCardStrength(card)
    const nextStrength = Math.max(0, Math.min(100, currentStrength + (adjustmentMap[rating] ?? 0)))
    const reviewCount = (card.reviewCount || 0) + 1
    const isCorrect = rating >= 2
    const correctStreak = isCorrect ? (card.correctStreak || 0) + 1 : 0
    const lapseCount = isCorrect ? (card.lapseCount || 0) : (card.lapseCount || 0) + 1

    return {
      ...card,
      difficulty: nextStrength,
      memoryStrength: nextStrength,
      state: nextStrength >= 80 ? 'mastered' : nextStrength >= 55 ? 'learning' : 'new',
      lastReviewed: new Date().toISOString(),
      lastReviewedAt: new Date().toISOString(),
      reviewCount,
      correctStreak,
      lapseCount,
      lastResult: rating,
      updatedAt: new Date().toISOString()
    }
  }

  const getCramCards = (deck, options, previousCardId) => {
    if (!deck?.cards?.length) return []

    const nowTurn = cramTurnRef.current
    const metrics = cramMetricsRef.current
    const candidates = deck.cards.map(card => {
      const cardMetrics = metrics.get(card.id) || {}
      const persistentPriority = (100 - getCardStrength(card)) * 1.2
      const missBoost = (cardMetrics.misses || 0) * 45
      const ratingBoost = cardMetrics.lastRating === 0 ? 35 : cardMetrics.lastRating === 1 ? 15 : 0
      const successPenalty = (cardMetrics.correct || 0) * 22
      const easePenalty = cardMetrics.lastRating === 3 ? 70 : cardMetrics.lastRating === 2 ? 35 : 0
      const cooldownRemaining = Math.max(0, (cardMetrics.cooldownUntil || 0) - nowTurn)

      return {
        card,
        priority: persistentPriority + missBoost + ratingBoost - successPenalty - easePenalty - cooldownRemaining * 25,
        cooldownRemaining
      }
    })

    const available = candidates.filter(item => (
      item.card.id !== previousCardId && item.cooldownRemaining === 0
    ))
    const ranked = (available.length > 0 ? available : candidates.filter(item => item.card.id !== previousCardId))
      .sort((a, b) => b.priority - a.priority)

    const selected = ranked.length > 0 ? ranked : candidates.sort((a, b) => b.priority - a.priority)
    return selected.map(({ card }) => {
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
  }

  const handleCardReview = (difficulty) => {
    if (!activeDeck || !studyCards || studyCards.length === 0) {
      return
    }

    const currentCard = studyCards[currentCardIndex]
    if (!currentCard) {
      setCurrentCardIndex(0)
      return
    }

    const updatedCard = updateCardReviewState(currentCard, difficulty)

    if (studyOptions.mode === 'cram') {
      const currentMetrics = cramMetricsRef.current.get(currentCard.id) || {
        attempts: 0,
        misses: 0,
        correct: 0
      }
      const isCramCorrect = difficulty >= 2
      const cooldownByRating = { 0: 0, 1: 2, 2: 6, 3: 12 }
      cramTurnRef.current += 1
      cramMetricsRef.current.set(currentCard.id, {
        ...currentMetrics,
        attempts: currentMetrics.attempts + 1,
        misses: currentMetrics.misses + (isCramCorrect ? 0 : 1),
        correct: currentMetrics.correct + (isCramCorrect ? 1 : 0),
        lastRating: difficulty,
        cooldownUntil: cramTurnRef.current + cooldownByRating[difficulty]
      })
    }

    const updatedDecks = decks.map(deck =>
      deck.id === activeDeck.id
        ? {
          ...deck,
          cards: deck.cards.map(card =>
            card.id === currentCard.id ? updatedCard : card
          )
        }
        : deck
    )
    setDecks(updatedDecks)

    const isCorrect = difficulty >= 2
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }))

    setReviewStats(prev => ({
      ...prev,
      totalReviews: prev.totalReviews + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      streakCount: isCorrect ? prev.streakCount + 1 : 0
    }))

    if (studyOptions.mode === 'cram') {
      const nextDeck = updatedDecks.find(deck => deck.id === activeDeck.id) || {
        ...activeDeck,
        cards: activeDeck.cards.map(card => card.id === currentCard.id ? updatedCard : card)
      }
      const nextCards = getCramCards(nextDeck, studyOptions, currentCard.id)
      setStudyCards(nextCards.length > 0 ? nextCards : [{
        ...updatedCard,
        studyDirection: studyOptions.direction,
        displayFront: studyOptions.direction === 'back-to-front' ? updatedCard.back : updatedCard.front,
        displayBack: studyOptions.direction === 'back-to-front' ? updatedCard.front : updatedCard.back
      }])
      setCurrentCardIndex(0)
      setShowResult(false)
    } else if (currentCardIndex < studyCards.length - 1) {
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
          <h2 className="mb-4">Choose a Deck</h2>
          {decks.length > 0 ? (
            <div className="w-full max-w-md space-y-2">
              {decks.map(deck => (
                <button
                  key={deck.id}
                  type="button"
                  disabled={!deck.cards?.length}
                  onClick={() => setActiveDeck(deck)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="font-medium text-gray-900">{deck.name}</span>
                  <span className="text-sm text-gray-500">
                    {deck.cards?.length || 0} {deck.cards?.length === 1 ? 'card' : 'cards'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No decks available yet.</p>
          )}
          <button className={`${styles.review.backButton} mt-5`} onClick={() => navigate('/')}>
            Manage Decks
          </button>
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
  const progress = studyOptions.mode === 'cram'
    ? 100
    : ((currentCardIndex + 1) / studyCards.length) * 100

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
          {studyOptions.mode === 'cram'
            ? `Cram mode • ${sessionStats.total} answered`
            : `${currentCardIndex + 1} of ${studyCards.length}`}
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


