import { useStorage } from '../utils'
import { THEME_VALUES } from '../utils/themes'
import { createContext, useState, useEffect } from 'react'

export const AppContext = createContext()

const getTimestamp = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : Date.parse(value) || 0
  }
  if (typeof value?.toMillis === 'function') return value.toMillis()
  return 0
}

const getDeckTimestamp = deck => getTimestamp(deck?.updatedAt) || getTimestamp(deck?.createdAt) || getTimestamp(deck?.id)

export const AppProvider = ({ children }) => {
  const { STORAGE_KEYS, saveToStorage, loadFromStorage } = useStorage()
  const [decks, setDecks] = useState([])
  const [deletedDecks, setDeletedDecks] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.DELETED_DECKS) || '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  })
  const [activeDeck, setActiveDeck] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [theme, setTheme] = useState('system')
  const [localSettingsChangedAt, setLocalSettingsChangedAt] = useState(() => {
    try {
      return Number(localStorage.getItem('flashcards_local_settings_changed_at')) || 0
    } catch {
      return 0
    }
  })
  const [reviewStats, setReviewStats] = useState({
    totalReviews: 0,
    correct: 0,
    incorrect: 0,
    streakCount: 0
  })
  const [studyOptions, setStudyOptions] = useState({
    mode: 'review',
    direction: 'front-to-back', // 'front-to-back', 'back-to-front', 'random'
    cardOrder: 'forward', // 'forward', 'reverse', 'random'
    onlyMissed: true,
    weakestFirst: true,
    onlyNew: true,
    onlyLearning: true,
    onlyMastered: true,
    statusFiltersVersion: 1,
    recentlyWrong: false,
    showBothSides: false, // Show both front and back when card flips
    autoRead: false, // Auto-read card contents using TTS
    cardLimit: 50, // Limit number of cards to study (null = no limit)
    cardLimitVersion: 1
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
      mode: 'review',
      direction: 'front-to-back',
      cardOrder: 'forward',
      onlyMissed: true,
      weakestFirst: true,
      onlyNew: true,
      onlyLearning: true,
      onlyMastered: true,
      statusFiltersVersion: 1,
      recentlyWrong: false,
      showBothSides: false,
      autoRead: false,
      cardLimit: 50,
      cardLimitVersion: 1
    })
    const savedTheme = loadFromStorage(STORAGE_KEYS.THEME, 'system')

    const normalizedStudyOptions = {
      ...savedStudyOptions,
      mode: savedStudyOptions.mode === 'cram' ? 'cram' : 'review',
      cardOrder: ['forward', 'reverse', 'random'].includes(savedStudyOptions.cardOrder) ? savedStudyOptions.cardOrder : 'forward',
      ...(savedStudyOptions.statusFiltersVersion === 1 ? {} : {
        onlyMissed: true,
        onlyNew: true,
        onlyLearning: true,
        onlyMastered: true,
        statusFiltersVersion: 1
      }),
      ...(savedStudyOptions.cardLimitVersion === 1 ? {} : {
        cardLimit: 50,
        cardLimitVersion: 1
      })
    }

    setDecks(savedDecks)
    setReviewStats(savedStats)
    setStudyOptions(normalizedStudyOptions)
    setTheme(THEME_VALUES.includes(savedTheme) ? savedTheme : 'system')
    setIsInitialized(true) // Mark as initialized after loading
  }, [])

  // Save decks to localStorage whenever decks change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveToStorage(STORAGE_KEYS.DECKS, decks)
    }
  }, [decks, isInitialized])

  useEffect(() => {
    if (isInitialized) saveToStorage(STORAGE_KEYS.DELETED_DECKS, deletedDecks)
  }, [deletedDecks, isInitialized])

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

  useEffect(() => {
    if (!isInitialized) return
    saveToStorage(STORAGE_KEYS.THEME, theme)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const resolvedTheme = theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolvedTheme
    }

    applyTheme()
    if (theme !== 'system') return
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [theme, isInitialized])

  // Enhanced setDecks that handles active deck synchronization
  const markLocalSettingsChanged = () => {
    const changedAt = Date.now()
    try {
      localStorage.setItem('flashcards_local_settings_changed_at', String(changedAt))
    } catch {}
    setLocalSettingsChangedAt(changedAt)
  }

  const handleDecksChange = (newDecks) => {
    const requestedDecks = typeof newDecks === 'function' ? newDecks(decks) : newDecks
    if (!Array.isArray(requestedDecks)) return

    const changedAt = Date.now()
    const previousById = new Map(decks.map(deck => [String(deck.id), deck]))
    const nextDecks = requestedDecks.map(deck => {
      const previousDeck = previousById.get(String(deck.id))
      if (!previousDeck) return deck.updatedAt ? deck : { ...deck, updatedAt: changedAt }
      if (JSON.stringify(previousDeck) === JSON.stringify(deck)) return deck

      const hasExplicitVersion = getTimestamp(deck.updatedAt) > getTimestamp(previousDeck.updatedAt)
      return hasExplicitVersion ? deck : { ...deck, updatedAt: changedAt }
    })

    if (JSON.stringify(decks) === JSON.stringify(nextDecks)) return

    const nextIds = new Set(nextDecks.map(deck => String(deck.id)))
    const removedDecks = decks.filter(deck => !nextIds.has(String(deck.id)))
    setDecks(nextDecks)
    setDeletedDecks(previousDeleted => {
      const markers = new Map(previousDeleted.map(marker => [String(marker.id), marker]))
      removedDecks.forEach(deck => markers.set(String(deck.id), { id: String(deck.id), deletedAt: changedAt }))
      nextDecks.forEach(deck => {
        const marker = markers.get(String(deck.id))
        if (marker && getDeckTimestamp(deck) > getTimestamp(marker.deletedAt)) markers.delete(String(deck.id))
      })
      return [...markers.values()]
    })
    if (activeDeck && removedDecks.some(deck => String(deck.id) === String(activeDeck.id))) setActiveDeck(null)
  }

  const applySyncedDecks = (syncedDecks) => {
    setDecks(syncedDecks)
    if (activeDeck && !syncedDecks.some(deck => String(deck.id) === String(activeDeck.id))) setActiveDeck(null)
  }

  const applySyncedPreferences = (preferences) => {
    setStudyOptions(preferences.studyOptions)
    setTheme(preferences.theme)
  }

  const handleStudyOptionsChange = (newOptions) => {
    setStudyOptions(newOptions)
    markLocalSettingsChanged()
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    markLocalSettingsChanged()
  }

  const value = {
    decks,
    setDecks: handleDecksChange,
    deletedDecks,
    setDeletedDecks,
    applySyncedDecks,
    applySyncedPreferences,
    activeDeck,
    setActiveDeck,
    reviewStats,
    setReviewStats,
    studyOptions,
    setStudyOptions: handleStudyOptionsChange,
    theme,
    setTheme: handleThemeChange,
    localSettingsChangedAt,
    isInitialized
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}
