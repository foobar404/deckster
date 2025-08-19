import { createContext, useState, useEffect } from 'react'
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from '../utils/storage'

export const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [decks, setDecks] = useState([])
  const [activeDeck, setActiveDeck] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [reviewStats, setReviewStats] = useState({
    totalReviews: 0,
    correct: 0,
    incorrect: 0,
    streakCount: 0
  })
  const [studyOptions, setStudyOptions] = useState({
    randomOrder: false,
    direction: 'front-to-back', // 'front-to-back', 'back-to-front', 'random'
    onlyMissed: false,
    showBothSides: false // Show both front and back when card flips
  })

  // Load data from localStorage on app start
  useEffect(() => {
    const savedDecks = loadFromStorage(STORAGE_KEYS.DECKS, [])
    const savedStats = loadFromStorage(STORAGE_KEYS.STATS, {
      totalReviews: 0,
      correct: 0,
      incorrect: 0,
      streakCount: 0
    })
    const savedStudyOptions = loadFromStorage(STORAGE_KEYS.STUDY_OPTIONS, {
      randomOrder: false,
      direction: 'front-to-back',
      onlyMissed: false,
      showBothSides: false
    })

    setDecks(savedDecks)
    setReviewStats(savedStats)
    setStudyOptions(savedStudyOptions)
    setIsInitialized(true) // Mark as initialized after loading
  }, [])

  // Save decks to localStorage whenever decks change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveToStorage(STORAGE_KEYS.DECKS, decks)
    }
  }, [decks, isInitialized])

  // Save stats to localStorage whenever stats change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveToStorage(STORAGE_KEYS.STATS, reviewStats)
    }
  }, [reviewStats, isInitialized])

  // Save study options to localStorage whenever they change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveToStorage(STORAGE_KEYS.STUDY_OPTIONS, studyOptions)
    }
  }, [studyOptions, isInitialized])

  // Enhanced setDecks that handles active deck synchronization
  const handleDecksChange = (newDecks) => {
    setDecks(newDecks)
    
    // If active deck was deleted, clear it
    if (activeDeck && typeof newDecks === 'function') {
      // Handle function updates
      const updatedDecks = newDecks(decks)
      const deckStillExists = updatedDecks.find(deck => deck.id === activeDeck.id)
      if (!deckStillExists) {
        setActiveDeck(null)
      }
    } else if (activeDeck && Array.isArray(newDecks)) {
      // Handle direct array updates
      const deckStillExists = newDecks.find(deck => deck.id === activeDeck.id)
      if (!deckStillExists) {
        setActiveDeck(null)
      }
    }
  }

  const value = {
    decks,
    setDecks: handleDecksChange,
    activeDeck,
    setActiveDeck,
    reviewStats,
    setReviewStats,
    studyOptions,
    setStudyOptions,
    isInitialized
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}
