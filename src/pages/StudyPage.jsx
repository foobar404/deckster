import '../css/study.css'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { useStorage, getCardState as resolveCardState, matchesStudyStatusFilters } from '../utils'
import { FlashCard } from '../components/FlashCard'
import { useState, useEffect, useCallback, useContext, useRef } from 'react'
import { FaBook, FaTrophy, FaExclamationTriangle, FaFlagCheckered } from 'react-icons/fa'

/**
 * Custom hook for StudyPage logic and state management
 * @returns {Object} All state and handlers needed by the StudyPage component
 */
const useStudyPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeDeck, decks, setDecks, setActiveDeck, setReviewStats, studyOptions: defaultStudyOptions } = useContext(AppContext)
  const studyOptions = activeDeck?.studyOptions || defaultStudyOptions
  const { showInfo } = useToast()
  const { saveToStorage, loadFromStorage, clearFromStorage, STORAGE_KEYS } = useStorage()
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 })
  const [sessionStartedAt, setSessionStartedAt] = useState(() => Date.now())
  const [ratingCounts, setRatingCounts] = useState({ 0: 0, 1: 0, 2: 0, 3: 0 })
  const [missedAnswers, setMissedAnswers] = useState([])
  const [isFocusedReview, setIsFocusedReview] = useState(false)
  const [studyCards, setStudyCards] = useState([])
  const [eligibleStudyCards, setEligibleStudyCards] = useState([])
  const [originalStudyCards, setOriginalStudyCards] = useState([]) // Store the original subset for "Study Again"
  const cramMetricsRef = useRef(new Map())
  const cramTurnRef = useRef(0)
  const finishedEarlyRef = useRef(false)
  const sessionTimeRecordedRef = useRef(false)
  const previousStudyOptionsRef = useRef(studyOptions)
  const [dragState, setDragState] = useState({
    isFlipped: false,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    selectedAnswer: null
  })
  // When we trigger a programmatic reset we want to avoid immediately re-loading saved state
  const ignoreLoadRef = useRef(false)
  const handledNavRootRef = useRef(null)

  // Save study state to localStorage
  const saveStudyState = useCallback(() => {
    if (activeDeck && studyCards.length > 0 && !finishedEarlyRef.current) {
      const studyState = {
        deckId: activeDeck.id,
        mode: studyOptions.mode,
        studyOptions,
        currentCardIndex,
        showResult,
        sessionStats,
        sessionStartedAt,
        ratingCounts,
        missedAnswers,
        isFocusedReview,
        studyCards,
        eligibleStudyCards,
        originalStudyCards,
        timestamp: Date.now()
      }

      if (studyOptions.mode === 'cram') {
        saveToStorage('deckster_cram_state', {
          ...studyState,
          cramTurn: cramTurnRef.current,
          cramMetrics: [...cramMetricsRef.current.entries()]
        })
      } else {
        saveToStorage('deckster_review_state', studyState)
      }
    }
  }, [activeDeck, currentCardIndex, showResult, sessionStats, sessionStartedAt, ratingCounts, missedAnswers, isFocusedReview, studyCards, eligibleStudyCards, originalStudyCards, studyOptions, saveToStorage])

  // Load study state from localStorage
  const loadStudyState = useCallback(() => {
    if (ignoreLoadRef.current) {
      return false
    }
    const isCramMode = studyOptions.mode === 'cram'
    const studyState = loadFromStorage(isCramMode ? 'deckster_cram_state' : 'deckster_review_state')

    if (studyState) {
      const savedOptions = studyState.studyOptions && {
        ...studyState.studyOptions,
        typeToAnswer: Boolean(studyState.studyOptions.typeToAnswer)
      }
      const optionsMatch = savedOptions &&
        Object.keys(savedOptions).length === Object.keys(studyOptions).length &&
        Object.entries(studyOptions).every(([key, value]) => savedOptions[key] === value)
      // Only restore if it's for the same deck and recent (within 24 hours)
      if (studyState.deckId === activeDeck?.id &&
        (studyState.mode || 'review') === (studyOptions.mode || 'review') &&
        optionsMatch &&
        Date.now() - studyState.timestamp < 24 * 60 * 60 * 1000) {

        if (isCramMode) {
          cramTurnRef.current = studyState.cramTurn || 0
          cramMetricsRef.current = new Map(studyState.cramMetrics || [])
        }
        setCurrentCardIndex(studyState.currentCardIndex)
        setShowResult(studyState.showResult)
        setSessionStats(studyState.sessionStats)
        setSessionStartedAt(studyState.sessionStartedAt || Date.now())
        setRatingCounts(studyState.ratingCounts || { 0: 0, 1: 0, 2: 0, 3: 0 })
        setMissedAnswers(studyState.missedAnswers || [])
        setIsFocusedReview(studyState.isFocusedReview || false)
        setStudyCards(studyState.studyCards)
        setEligibleStudyCards(studyState.eligibleStudyCards || studyState.originalStudyCards || studyState.studyCards)
        setOriginalStudyCards(studyState.originalStudyCards || studyState.studyCards)
        return true
      }
    }
    return false
  }, [activeDeck, studyOptions, loadFromStorage])

  // Clear review state
  const clearStudyState = useCallback(() => {
    clearFromStorage('deckster_review_state')
    clearFromStorage('deckster_cram_state')
  }, [clearFromStorage])

  const recordSessionTime = useCallback(() => {
    if (sessionTimeRecordedRef.current || !activeDeck) return
    sessionTimeRecordedRef.current = true

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000))
    if (elapsedSeconds === 0) return

    setDecks(previousDecks => previousDecks.map(deck => (
      deck.id === activeDeck.id
        ? {
          ...deck,
          totalStudyTimeSeconds: Math.max(0, Number(deck.totalStudyTimeSeconds) || 0) + elapsedSeconds,
          updatedAt: Date.now()
        }
        : deck
    )))
  }, [activeDeck, sessionStartedAt, setDecks])

  const getCardStrength = useCallback((card) => {
    if (typeof card?.memoryStrength === 'number') return Math.max(0, Math.min(100, card.memoryStrength))
    if (typeof card?.difficulty === 'number') return Math.max(0, Math.min(100, card.difficulty))
    return 0
  }, [])

  const getCardState = useCallback(resolveCardState, [])

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

    const isFocusedReview = Array.isArray(options?.cardIds)
    let cards = isFocusedReview
      ? deck.cards.filter(card => options.cardIds.includes(card.id))
      : [...deck.cards]

    cards = cards.filter(card => matchesStudyStatusFilters(card, options))

    if (!isFocusedReview) {
      if (options?.mode !== 'cram' && options?.recentlyWrong) {
        cards = cards.filter(card => (card.lapseCount || 0) > 0 || (card.lastResult ?? 3) < 2)
      }
    }

    if (options?.mode === 'cram' && options?.weakestFirst) {
      cards.sort((a, b) => getReviewPriority(b) - getReviewPriority(a))
    }

    if (options?.mode !== 'cram') {
      if (options?.cardOrder === 'reverse') {
        cards.reverse()
      } else if (options?.cardOrder === 'random') {
        for (let index = cards.length - 1; index > 0; index -= 1) {
          const randomIndex = Math.floor(Math.random() * (index + 1))
          const currentCard = cards[index]
          cards[index] = cards[randomIndex]
          cards[randomIndex] = currentCard
        }
      }
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

    if (!isFocusedReview && options?.mode !== 'cram' && options?.cardLimit && options.cardLimit > 0) {
      return studyCards.slice(0, options.cardLimit)
    }

    return studyCards
  }, [getCardState, getCardStrength, getReviewPriority])

  // Re-prioritize existing study cards for "Study Again" functionality
  const resortStudyCards = useCallback((cards, options) => {
    if (!cards || cards.length === 0) return cards

    const sortedCards = [...cards]

    if (options?.mode === 'cram' && options?.weakestFirst) {
      sortedCards.sort((a, b) => getReviewPriority(b) - getReviewPriority(a))
    }

    return sortedCards
  }, [getReviewPriority])

  // Reset the current review session. We set ignoreLoadRef so any load effect
  // triggered by this action won't immediately restore the previous saved state.
  const resetSession = useCallback((forceNewSubset = false) => {

    ignoreLoadRef.current = true
    finishedEarlyRef.current = false
    sessionTimeRecordedRef.current = false
    cramMetricsRef.current = new Map()
    cramTurnRef.current = 0
    // Clear persisted state
    clearFromStorage('deckster_review_state')
    clearFromStorage('deckster_cram_state')

    // Reset in-memory state
    if (!forceNewSubset && originalStudyCards.length > 0) {
      const prioritizedCards = resortStudyCards(originalStudyCards, studyOptions)
      setStudyCards(prioritizedCards)
    } else {
      const eligibleCards = prepareStudyCards(activeDeck, { ...studyOptions, cardLimit: null })
      const cards = studyOptions.mode !== 'cram' && studyOptions.cardLimit
        ? eligibleCards.slice(0, studyOptions.cardLimit)
        : eligibleCards
      setStudyCards(cards)
      setEligibleStudyCards(eligibleCards)
      setOriginalStudyCards(cards) // Store the new subset as original
    }
    
    setCurrentCardIndex(0)
    setShowResult(false)
    setSessionStats({ correct: 0, total: 0 })
    setSessionStartedAt(Date.now())
    setRatingCounts({ 0: 0, 1: 0, 2: 0, 3: 0 })
    setMissedAnswers([])
    setIsFocusedReview(false)

    // Allow loads again after a short tick so other effects can run
    setTimeout(() => { ignoreLoadRef.current = false }, 200)
  }, [activeDeck, prepareStudyCards, resortStudyCards, originalStudyCards, studyOptions, clearFromStorage])

  const finishSession = useCallback(() => {
    recordSessionTime()
    finishedEarlyRef.current = true
    clearStudyState()
    setShowResult(true)
  }, [clearStudyState, recordSessionTime])

  const continueSession = useCallback(() => {
    const answeredCards = studyCards.slice(0, sessionStats.total)
    const answeredIds = new Set(answeredCards.map(card => card.id))
    const remainingCards = eligibleStudyCards.filter(card => !answeredIds.has(card.id))

    if (remainingCards.length === 0) return

    const continuedCards = [...answeredCards, ...remainingCards]
    clearStudyState()
    finishedEarlyRef.current = false
    sessionTimeRecordedRef.current = false
    setSessionStartedAt(Date.now())
    setStudyCards(continuedCards)
    setEligibleStudyCards(continuedCards)
    setOriginalStudyCards(continuedCards)
    setIsFocusedReview(false)
    setCurrentCardIndex(answeredCards.length)
    setShowResult(false)
  }, [clearStudyState, eligibleStudyCards, sessionStats.total, studyCards])

  // Initialize study cards when deck changes
  useEffect(() => {
    cramMetricsRef.current = new Map()
    cramTurnRef.current = 0
  }, [activeDeck, studyOptions.mode])

  useEffect(() => {
    const navRoot = location.state?.navRoot
    const resetFromNavigation = Boolean(navRoot && handledNavRootRef.current !== navRoot)
    const optionsChanged = previousStudyOptionsRef.current !== studyOptions
    previousStudyOptionsRef.current = studyOptions

    if (resetFromNavigation || optionsChanged) {
      if (resetFromNavigation) handledNavRootRef.current = navRoot
      clearStudyState()
      finishedEarlyRef.current = false
      sessionTimeRecordedRef.current = false
      ignoreLoadRef.current = false
      cramMetricsRef.current = new Map()
      cramTurnRef.current = 0
      setActiveDeck(null)
      setStudyCards([])
      setEligibleStudyCards([])
      setOriginalStudyCards([])
      setCurrentCardIndex(0)
      setShowResult(false)
      setSessionStats({ correct: 0, total: 0 })
      setSessionStartedAt(Date.now())
      setRatingCounts({ 0: 0, 1: 0, 2: 0, 3: 0 })
      setMissedAnswers([])
      setIsFocusedReview(false)
      setDragState({ isFlipped: false, isDragging: false, dragOffset: { x: 0, y: 0 }, selectedAnswer: null })
      return
    }

    if (!activeDeck) return

    sessionTimeRecordedRef.current = false
    const stateLoaded = loadStudyState()
    if (stateLoaded) return

    finishedEarlyRef.current = false
    const cards = prepareStudyCards(activeDeck, studyOptions)
    const eligibleCards = prepareStudyCards(activeDeck, { ...studyOptions, cardLimit: null })

    setStudyCards(cards)
    setEligibleStudyCards(eligibleCards)
    setOriginalStudyCards(cards)
    setCurrentCardIndex(0)
    setShowResult(false)
    setSessionStats({ correct: 0, total: 0 })
    setSessionStartedAt(Date.now())
    setRatingCounts({ 0: 0, 1: 0, 2: 0, 3: 0 })
    setMissedAnswers([])
    setIsFocusedReview(false)
  }, [activeDeck, prepareStudyCards, loadStudyState, studyOptions, location.key, location.state, clearStudyState])

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
    finishSession,
    continueSession,
    currentCardIndex,
    setCurrentCardIndex,
    showResult,
    setShowResult,
    sessionStats,
    setSessionStats,
    sessionStartedAt,
    ratingCounts,
    setRatingCounts,
    missedAnswers,
    setMissedAnswers,
    isFocusedReview,
    studyCards,
    eligibleStudyCards,
    setStudyCards,
    dragState,
    setDragState,
    cramMetricsRef,
    cramTurnRef,
    finishedEarlyRef,
    recordSessionTime,
    saveStudyState,
    loadStudyState,
    clearStudyState
  }
}

export function StudyPage() {
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
    finishSession,
    continueSession,
    recordSessionTime,
    currentCardIndex,
    setCurrentCardIndex,
    showResult,
    setShowResult,
    sessionStats,
    setSessionStats,
    sessionStartedAt,
    ratingCounts,
    setRatingCounts,
    missedAnswers,
    setMissedAnswers,
    isFocusedReview,
    studyCards,
    eligibleStudyCards,
    setStudyCards,
    dragState,
    setDragState,
    cramMetricsRef,
    cramTurnRef,
    finishedEarlyRef,
    saveStudyState,
    loadStudyState
  } = useStudyPage()
  const preloadedImageRef = useRef(null)

  useEffect(() => {
    const nextCard = studyCards[currentCardIndex + 1]
    if (!nextCard) {
      preloadedImageRef.current = null
      return
    }

    const nextFront = nextCard.displayFront ?? nextCard.front
    const nextBack = nextCard.displayBack ?? nextCard.back
    const getEmbeddedImageUrl = text => typeof text === 'string'
      ? text.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(?:\?[^\s]*)?/i)?.[0]
      : null
    const imageUrl = nextCard.displayFrontImage ||
      nextCard.frontImageUrl ||
      getEmbeddedImageUrl(nextFront) ||
      nextCard.displayBackImage ||
      nextCard.backImageUrl ||
      nextCard.imageUrl ||
      getEmbeddedImageUrl(nextBack)
    if (!imageUrl) {
      preloadedImageRef.current = null
      return
    }

    const image = new Image()
    image.decoding = 'async'
    image.fetchPriority = 'low'
    image.src = imageUrl
    preloadedImageRef.current = image
  }, [studyCards, currentCardIndex])

  const customStyles = {
    container: 'study-page',
    studyContainer: 'study-page',
    emptyState: 'study-empty-state',
    emptyIcon: 'study-empty-state__icon',
    header: 'study-progress',
    headerInner: 'study-progress__inner',
    headerText: 'study-progress__count',
    progressBar: 'study-progress__track',
    progressFill: 'study-progress__fill',
    cardStack: 'study-card-stack',
    panel: 'study-panel',
    panelLarge: 'study-result-panel',
    backButton: 'button button--primary study-page__action-button',
    resultButton: 'button button--primary study-page__action-button',
    quadContainer: 'study-quadrants',
    quadTopLeft: 'study-quadrant study-quadrant--top-left',
    quadTopLeftActive: 'is-active',
    quadTopRight: 'study-quadrant study-quadrant--top-right',
    quadTopRightActive: 'is-active',
    quadBottomLeft: 'study-quadrant study-quadrant--bottom-left',
    quadBottomLeftActive: 'is-active',
    quadBottomRight: 'study-quadrant study-quadrant--bottom-right',
    quadBottomRightActive: 'is-active',
    cardWrapper: 'study-card-wrapper',
    resultIcon: 'study-result__icon',
    resultTitle: 'study-result__title',
    resultNumber: 'study-result__number',
    resultLabel: 'study-result__label',
    resultNumberAccent: 'study-result__number study-result__number--accent'
  }

  const styles = { study: customStyles }

  // Save study state whenever it changes
  useEffect(() => {
    saveStudyState()
  }, [currentCardIndex, showResult, sessionStats, studyCards, saveStudyState])

  // Save state when component unmounts (navigating away)
  useEffect(() => {
    return () => {
      // Save current state before unmounting
      if (activeDeck && studyCards.length > 0 && !showResult && !finishedEarlyRef.current) {
        // Use the hook-provided saver to persist study state
        saveStudyState()
      }
    }
  }, [activeDeck, currentCardIndex, showResult, sessionStats, studyCards, saveStudyState])

  const getCardStrength = (card) => {
    if (typeof card?.memoryStrength === 'number') return Math.max(0, Math.min(100, card.memoryStrength))
    if (typeof card?.difficulty === 'number') return Math.max(0, Math.min(100, card.difficulty))
    return 0
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
    const reviewedAt = new Date().toISOString()
    const reviewHistory = Array.isArray(card.reviewHistory) ? card.reviewHistory : []

    const updatedCard = {
      ...card,
      difficulty: nextStrength,
      memoryStrength: nextStrength,
      state: rating < 2 ? 'struggling' : 'learning',
      lastReviewed: reviewedAt,
      lastReviewedAt: reviewedAt,
      reviewCount,
      correctStreak,
      lapseCount,
      lastResult: rating,
      reviewHistory: [...reviewHistory, {
        review: reviewCount,
        rating,
        mode: studyOptions.mode === 'cram' ? 'cram' : 'study',
        reviewedAt,
        strength: nextStrength
      }],
      updatedAt: reviewedAt
    }
    updatedCard.state = resolveCardState(updatedCard)
    return updatedCard
  }

  const getCramCards = (deck, options, previousCardId) => {
    if (!deck?.cards?.length) return []

    const nowTurn = cramTurnRef.current
    const metrics = cramMetricsRef.current
    const candidates = deck.cards.filter(card => matchesStudyStatusFilters(card, options)).map(card => {
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

    const latestDeck = decks.find(deck => deck.id === activeDeck.id) || activeDeck
    const latestCard = latestDeck.cards.find(card => card.id === currentCard.id) || currentCard
    const updatedCard = updateCardReviewState(latestCard, difficulty)

    setRatingCounts(prev => ({ ...prev, [difficulty]: prev[difficulty] + 1 }))
    if (difficulty < 2) {
      setMissedAnswers(prev => {
        const existingAnswer = prev.find(answer => answer.cardId === currentCard.id)
        if (existingAnswer) {
          return prev.map(answer => answer.cardId === currentCard.id
            ? { ...answer, misses: answer.misses + 1 }
            : answer)
        }
        return [...prev, {
          cardId: currentCard.id,
          front: currentCard.displayFront ?? currentCard.front ?? '',
          back: currentCard.displayBack ?? currentCard.back ?? '',
          misses: 1
        }]
      })
    }
    if (studyOptions.mode === 'cram' && !isFocusedReview) {
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

    if (studyOptions.mode === 'cram' && !isFocusedReview) {
      const nextDeck = updatedDecks.find(deck => deck.id === activeDeck.id) || {
        ...activeDeck,
        cards: activeDeck.cards.map(card => card.id === currentCard.id ? updatedCard : card)
      }
      const nextCards = getCramCards(nextDeck, studyOptions, currentCard.id)
      setStudyCards(nextCards)
      setCurrentCardIndex(0)
      if (nextCards.length === 0) recordSessionTime()
      setShowResult(nextCards.length === 0)
    } else if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
    } else {
      recordSessionTime()
      setShowResult(true)
    }
  }

  // resetSession provided by useStudyPage hook is used instead (contains ignoreLoadRef logic)

  const handleDragStateChange = useCallback((newDragState) => {
    setDragState(newDragState)
  }, [])

  if (!activeDeck || !activeDeck.cards || activeDeck.cards.length === 0) {
    return (
      <div className={styles.study.container}>
        <h1 className="study-page__title">Study</h1>
        <p className="study-page__description">Start a study session by selecting a deck from the Decks page.</p>
        <div className={styles.study.panel}>
          <div className={styles.study.emptyIcon}><FaBook /></div>
          <h2 className="study-empty-state__title">Choose a Deck</h2>
          {decks.length > 0 ? (
            <div className="study-deck-list">
              {decks.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map(deck => (
                <button
                  key={deck.id}
                  type="button"
                  disabled={!deck.cards?.length}
                  onClick={() => setActiveDeck(deck)}
                  className="study-deck-option"
                >
                  <span className="study-deck-option__name">{deck.name}</span>
                  <span className="study-deck-option__count">
                    {deck.cards?.length || 0} {deck.cards?.length === 1 ? 'card' : 'cards'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className="study-empty-state__description">No decks available yet.</p>
              <button className={styles.study.backButton} onClick={() => navigate('/')}>
                Manage Decks
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (studyCards.length === 0 && !showResult) {
    return (
      <div className={styles.study.container}>
        <div className={styles.study.panel}>
          <div className={styles.study.emptyIcon}><FaExclamationTriangle /></div>
          <h2 className="study-empty-state__title">No Cards to Study</h2>
          <p className="study-empty-state__description">No cards match the selected study filters. Update the filters or choose another deck.</p>
          <button className={styles.study.backButton} onClick={() => navigate('/')}>
            Back to Decks
          </button>
        </div>
      </div>
    )
  }

  if (showResult) {
    const accuracy = sessionStats.total ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000))
    const elapsedDuration = elapsedSeconds >= 3600
      ? `${Math.floor(elapsedSeconds / 3600)}h ${Math.floor((elapsedSeconds % 3600) / 60)}m`
      : elapsedSeconds >= 60
        ? `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`
        : `${elapsedSeconds}s`
    const ratingSummary = [
      { rating: 0, label: 'Again' },
      { rating: 1, label: 'Hard' },
      { rating: 2, label: 'Good' },
      { rating: 3, label: 'Easy' }
    ]
    const mostMissedAnswers = [...missedAnswers].sort((a, b) => b.misses - a.misses)
    return (
      <div
        className={`${styles.study.container} study-page--scrollable study-page--result`}
      >
        <div className={styles.study.panelLarge}>
          <div className={styles.study.resultIcon}><FaTrophy /></div>
          <h2 className={styles.study.resultTitle}>Session Complete!</h2>
          <div className="study-result__stats">
            <div className="study-result__stat">
              <span className={styles.study.resultNumber}>{sessionStats.total}</span>
              <span className={styles.study.resultLabel}>Cards Studied</span>
            </div>
            <div className="study-result__stat">
              <span className={styles.study.resultNumberAccent}>{accuracy}%</span>
              <span className={styles.study.resultLabel}>Accuracy</span>
            </div>
            <div className="study-result__stat">
              <span className="study-result__number">{elapsedDuration}</span>
              <span className={styles.study.resultLabel}>Time</span>
            </div>
          </div>
          <section className="study-result__section">
            <h3 className="study-result__section-title">Rating breakdown</h3>
            <div className="study-result__ratings">
              {ratingSummary.map(({ rating, label }) => (
                <div key={rating} className="study-result__rating">
                  <span className="study-result__rating-count">{ratingCounts[rating]}</span>
                  <span className="study-result__rating-label">{label}</span>
                </div>
              ))}
            </div>
          </section>
          {mostMissedAnswers.length > 0 && (
            <section className="study-result__section">
              <h3 className="study-result__section-title">Most missed</h3>
              <div className="study-result__missed-list">
                {mostMissedAnswers.map(({ cardId, front, back, misses }) => (
                  <div key={cardId} className="study-result__missed-item">
                    <div className="study-result__missed-text">
                      <p className="study-result__missed-front">{front}</p>
                      <p className="study-result__missed-back">{back}</p>
                    </div>
                    <span className="study-result__missed-count">
                      {misses} {misses === 1 ? 'miss' : 'misses'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <div className="study-result__actions">
            <button className={styles.study.resultButton} onClick={() => resetSession()}>
              Study Again
            </button>
            {studyOptions.mode !== 'cram' && sessionStats.total < eligibleStudyCards.length && (
              <button className={styles.study.resultButton} onClick={continueSession}>
                Continue
              </button>
            )}
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
    <div className={`${styles.study.studyContainer} study-page--session`}>
      {/* Quadrant indicators when card is flipped */}
      {dragState.isFlipped && (
        // Place quadrant overlays behind the card so they are visible through translucent card backgrounds
        <div className={styles.study.quadContainer}>
          {/* All quadrants show a faint color by default; dragging intensifies border/opacity */}
          <div className={`${styles.study.quadTopLeft} ${dragState.isDragging && dragState.selectedAnswer === 0 ? styles.study.quadTopLeftActive : ''}`} />
          <div className={`${styles.study.quadTopRight} ${dragState.isDragging && dragState.selectedAnswer === 3 ? styles.study.quadTopRightActive : ''}`} />
          <div className={`${styles.study.quadBottomLeft} ${dragState.isDragging && dragState.selectedAnswer === 1 ? styles.study.quadBottomLeftActive : ''}`} />
          <div className={`${styles.study.quadBottomRight} ${dragState.isDragging && dragState.selectedAnswer === 2 ? styles.study.quadBottomRightActive : ''}`} />
        </div>
      )}

      <div className={styles.study.header}>
        <div className={styles.study.headerInner}>
          <div className={styles.study.headerText}>
            {studyOptions.mode === 'cram'
              ? `${sessionStats.total} answered`
              : `${currentCardIndex + 1}/${studyCards.length}`}
          </div>
          <div className={styles.study.progressBar}>
            <div
              className={styles.study.progressFill}
              style={{ width: `${progress}%` }}
              key={`progress-${currentCardIndex}`}
            ></div>
          </div>
          <button
            type="button"
            className="button button--icon button--quiet study-finish-button"
            onClick={(e) => { e.stopPropagation(); finishSession(); }}
            title="Finish study session"
            aria-label="Finish study session"
          >
            <FaFlagCheckered className="study-finish-button__icon" />
          </button>
        </div>
      </div>

      <div className={styles.study.cardStack}>
        {/* Constrain the card area so header + card + controls fit on one screen */}
        <div className={styles.study.cardWrapper}>
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
            appearance={activeDeck.appearance}
          />
        </div>
      </div>
    </div>
  )
}
