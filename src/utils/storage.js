// Data management utilities for localStorage

export const STORAGE_KEYS = {
  DECKS: 'flashcards_decks',
  STATS: 'flashcards_stats',
  STUDY_OPTIONS: 'flashcards_study_options'
}

export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Error saving to localStorage:', error)
    return false
  }
}

export const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error('Error loading from localStorage:', error)
    return defaultValue
  }
}

export const clearStorage = (key = null) => {
  try {
    if (key) {
      localStorage.removeItem(key)
    } else {
      // Clear all flashcard data
      Object.values(STORAGE_KEYS).forEach(storageKey => {
        localStorage.removeItem(storageKey)
      })
    }
    return true
  } catch (error) {
    console.error('Error clearing localStorage:', error)
    return false
  }
}

export const exportData = () => {
  try {
    const data = {
      decks: loadFromStorage(STORAGE_KEYS.DECKS, []),
      stats: loadFromStorage(STORAGE_KEYS.STATS, {}),
      exportDate: new Date().toISOString()
    }
    return JSON.stringify(data, null, 2)
  } catch (error) {
    console.error('Error exporting data:', error)
    return null
  }
}

export const importData = (jsonString) => {
  try {
    const data = JSON.parse(jsonString)
    
    if (data.decks && Array.isArray(data.decks)) {
      saveToStorage(STORAGE_KEYS.DECKS, data.decks)
    }
    
    if (data.stats && typeof data.stats === 'object') {
      saveToStorage(STORAGE_KEYS.STATS, data.stats)
    }
    
    return true
  } catch (error) {
    console.error('Error importing data:', error)
    return false
  }
}
