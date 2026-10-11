import { useStorage } from '../utils'
import { THEME_MODE_VALUES, THEME_OPTIONS, THEME_VALUES } from '../utils/themes'
import { createContext, useState, useEffect } from 'react'

export const AppContext = createContext()

const DEFAULT_STUDY_OPTIONS = {
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
  typeToAnswer: false,
  autoRead: false,
  cardLimit: 50,
  cardLimitVersion: 1
}

const normalizeStudyOptions = (options, fallback = DEFAULT_STUDY_OPTIONS) => {
  const savedOptions = options && typeof options === 'object' ? options : {}
  const mergedOptions = { ...fallback, ...savedOptions }

  return {
    ...mergedOptions,
    mode: mergedOptions.mode === 'cram' ? 'cram' : 'review',
    typeToAnswer: Boolean(mergedOptions.typeToAnswer),
    cardOrder: ['forward', 'reverse', 'random'].includes(mergedOptions.cardOrder) ? mergedOptions.cardOrder : 'forward',
    ...(mergedOptions.statusFiltersVersion === 1 ? {} : {
      onlyMissed: true,
      onlyNew: true,
      onlyLearning: true,
      onlyMastered: true,
      statusFiltersVersion: 1
    }),
    ...(mergedOptions.cardLimitVersion === 1 ? {} : {
      cardLimit: 50,
      cardLimitVersion: 1
    })
  }
}

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
  const [theme, setTheme] = useState('light')
  const [themeMode, setThemeMode] = useState('system')
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
  const [studyOptions, setStudyOptions] = useState(DEFAULT_STUDY_OPTIONS)

  // Load data from localStorage on app start
  useEffect(() => {
    const storedDecks = loadFromStorage(STORAGE_KEYS.DECKS, [])
    const savedDecks = Array.isArray(storedDecks) ? storedDecks : []
    const savedDeletedDecks = loadFromStorage(STORAGE_KEYS.DELETED_DECKS, [])
    const hasDeckHistory = savedDecks.length > 0 || (Array.isArray(savedDeletedDecks) && savedDeletedDecks.length > 0)
    const initialDecks = hasDeckHistory ? savedDecks : (() => {
      const now = new Date().toISOString()
      const facts = [
        ['How many hearts does an octopus have?', 'Three.'],
        ['Which bird can fly backwards?', 'The hummingbird.'],
        ['What is the dot over a lowercase i or j called?', 'A tittle.'],
        ['Botanically, which is a berry: a strawberry or a banana?', 'A banana.'],
        ['What is the only mammal capable of powered flight?', 'A bat.']
      ]
      const cards = facts.map(([front, back], index) => ({
        id: Date.now() + index,
        front,
        back,
        difficulty: 0,
        memoryStrength: 0,
        state: 'new',
        lastReviewed: null,
        lastReviewedAt: null,
        reviewCount: 0,
        correctStreak: 0,
        lapseCount: 0,
        lastResult: null,
        createdAt: now
      }))
      return [{
        id: Date.now(),
        name: 'Tiny Weird Facts',
        cards,
        appearance: { icon: '\u2728', color: '#fef3c7' },
        createdAt: now,
        totalStudyTimeSeconds: 0,
        updatedAt: Date.now()
      }]
    })()
    const savedStats = loadFromStorage(STORAGE_KEYS.STATS, {
      totalReviews: 0,
      correct: 0,
      incorrect: 0,
      streakCount: 0
    })
    const savedStudyOptions = loadFromStorage(STORAGE_KEYS.STUDY_OPTIONS, DEFAULT_STUDY_OPTIONS)
    const savedTheme = loadFromStorage(STORAGE_KEYS.THEME, 'system')
    const normalizedTheme = THEME_VALUES.includes(savedTheme) ? savedTheme : 'light'
    const savedThemeMode = loadFromStorage(STORAGE_KEYS.THEME_MODE, null)
    const legacyThemeMode = savedTheme === 'system'
      ? 'system'
      : THEME_OPTIONS.find(option => option.value === savedTheme)?.defaultMode || 'system'
    const normalizedThemeMode = THEME_MODE_VALUES.includes(savedThemeMode)
      ? savedThemeMode
      : legacyThemeMode

    const normalizedStudyOptions = normalizeStudyOptions(savedStudyOptions)
    const decksWithStudyOptions = initialDecks.map(deck => ({
      ...deck,
      studyOptions: normalizeStudyOptions(deck.studyOptions, normalizedStudyOptions)
    }))

    setDecks(decksWithStudyOptions)
    setReviewStats(savedStats)
    setStudyOptions(normalizedStudyOptions)
    setTheme(normalizedTheme)
    setThemeMode(normalizedThemeMode)
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
    saveToStorage(STORAGE_KEYS.THEME_MODE, themeMode)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const resolvedMode = themeMode === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : themeMode
      document.documentElement.dataset.theme = theme
      document.documentElement.dataset.themeMode = resolvedMode
    }

    applyTheme()
    if (themeMode !== 'system') return
    mediaQuery.addEventListener('change', applyTheme)
    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [theme, themeMode, isInitialized])

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
      const normalizedDeck = {
        ...deck,
        studyOptions: normalizeStudyOptions(deck.studyOptions, studyOptions)
      }
      const previousDeck = previousById.get(String(deck.id))
      if (!previousDeck) return normalizedDeck.updatedAt ? normalizedDeck : { ...normalizedDeck, updatedAt: changedAt }
      if (JSON.stringify(previousDeck) === JSON.stringify(normalizedDeck)) return normalizedDeck

      const hasExplicitVersion = getTimestamp(normalizedDeck.updatedAt) > getTimestamp(previousDeck.updatedAt)
      return hasExplicitVersion ? normalizedDeck : { ...normalizedDeck, updatedAt: changedAt }
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

  const updateDeckStudyOptions = (deckId, update) => {
    if (deckId === null || deckId === undefined) return

    const changedAt = Date.now()
    const getUpdatedOptions = currentOptions => normalizeStudyOptions(
      typeof update === 'function' ? update(currentOptions) : update,
      studyOptions
    )

    setDecks(previousDecks => previousDecks.map(deck => {
      if (String(deck.id) !== String(deckId)) return deck
      return {
        ...deck,
        studyOptions: getUpdatedOptions(deck.studyOptions || studyOptions),
        updatedAt: changedAt
      }
    }))
    setActiveDeck(currentDeck => {
      if (!currentDeck || String(currentDeck.id) !== String(deckId)) return currentDeck
      return {
        ...currentDeck,
        studyOptions: getUpdatedOptions(currentDeck.studyOptions || studyOptions),
        updatedAt: changedAt
      }
    })
    markLocalSettingsChanged()
  }

  const applySyncedDecks = (syncedDecks) => {
    const currentDecksById = new Map(decks.map(deck => [String(deck.id), deck]))
    const normalizedDecks = syncedDecks.map(deck => {
      const currentDeck = currentDecksById.get(String(deck.id))
      return {
        ...deck,
        studyOptions: normalizeStudyOptions(deck.studyOptions, currentDeck?.studyOptions || studyOptions)
      }
    })
    setDecks(normalizedDecks)
    if (activeDeck && !normalizedDecks.some(deck => String(deck.id) === String(activeDeck.id))) setActiveDeck(null)
  }

  const applySyncedPreferences = (preferences) => {
    setStudyOptions(normalizeStudyOptions(preferences.studyOptions, studyOptions))
    setTheme(THEME_VALUES.includes(preferences.theme) ? preferences.theme : 'light')
    setThemeMode(THEME_MODE_VALUES.includes(preferences.themeMode) ? preferences.themeMode : 'system')
  }

  const handleStudyOptionsChange = (newOptions) => {
    setStudyOptions(newOptions)
    markLocalSettingsChanged()
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    markLocalSettingsChanged()
  }

  const handleThemeModeChange = (newThemeMode) => {
    setThemeMode(newThemeMode)
    markLocalSettingsChanged()
  }

  const value = {
    decks,
    setDecks: handleDecksChange,
    updateDeckStudyOptions,
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
    themeMode,
    setThemeMode: handleThemeModeChange,
    localSettingsChangedAt,
    isInitialized
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}
