import { useState, useCallback, useEffect } from 'react'

export const STORAGE_KEYS = {
    DECKS: 'flashcards_decks',
    STATS: 'flashcards_stats',
    STUDY_OPTIONS: 'flashcards_study_options'
}

export const useStorage = () => {
    const [storageError, setStorageError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    // Clear any previous errors when hook initializes
    useEffect(() => {
        setStorageError(null)
    }, [])

    /**
     * Save data to localStorage
     */
    const saveToStorage = useCallback((key, data) => {
        try {
            setIsLoading(true)
            setStorageError(null)
            localStorage.setItem(key, JSON.stringify(data))
            setIsLoading(false)
            return true
        } catch (error) {
            console.error('Error saving to localStorage:', error)
            setStorageError(`Failed to save data: ${error.message}`)
            setIsLoading(false)
            return false
        }
    }, [])

    /**
     * Load data from localStorage
     */
    const loadFromStorage = useCallback((key, defaultValue = null) => {
        try {
            setIsLoading(true)
            setStorageError(null)
            const item = localStorage.getItem(key)
            const result = item ? JSON.parse(item) : defaultValue
            setIsLoading(false)
            return result
        } catch (error) {
            console.error('Error loading from localStorage:', error)
            setStorageError(`Failed to load data: ${error.message}`)
            setIsLoading(false)
            return defaultValue
        }
    }, [])

    /**
     * Clear specific key from localStorage
     */
    const clearFromStorage = useCallback((key) => {
        try {
            setIsLoading(true)
            setStorageError(null)
            localStorage.removeItem(key)
            setIsLoading(false)
            return true
        } catch (error) {
            console.error('Error clearing from localStorage:', error)
            setStorageError(`Failed to clear data: ${error.message}`)
            setIsLoading(false)
            return false
        }
    }, [])

    /**
     * Clear all flashcard data or specific key
     */
    const clearStorage = useCallback((key = null) => {
        try {
            setIsLoading(true)
            setStorageError(null)

            if (key) {
                localStorage.removeItem(key)
            } else {
                // Clear all flashcard data
                Object.values(STORAGE_KEYS).forEach(storageKey => {
                    localStorage.removeItem(storageKey)
                })
            }

            setIsLoading(false)
            return true
        } catch (error) {
            console.error('Error clearing localStorage:', error)
            setStorageError(`Failed to clear storage: ${error.message}`)
            setIsLoading(false)
            return false
        }
    }, [])

    /**
     * Export all flashcard data as JSON string
     */
    const exportData = useCallback(() => {
        try {
            setIsLoading(true)
            setStorageError(null)

            const data = {
                decks: loadFromStorage(STORAGE_KEYS.DECKS, []),
                stats: loadFromStorage(STORAGE_KEYS.STATS, {}),
                exportDate: new Date().toISOString()
            }

            const result = JSON.stringify(data, null, 2)
            setIsLoading(false)
            return result
        } catch (error) {
            console.error('Error exporting data:', error)
            setStorageError(`Failed to export data: ${error.message}`)
            setIsLoading(false)
            return null
        }
    }, [loadFromStorage])

    /**
     * Import flashcard data from JSON string
     */
    const importData = useCallback((jsonString) => {
        try {
            setIsLoading(true)
            setStorageError(null)

            const data = JSON.parse(jsonString)

            if (data.decks && Array.isArray(data.decks)) {
                saveToStorage(STORAGE_KEYS.DECKS, data.decks)
            }

            if (data.stats && typeof data.stats === 'object') {
                saveToStorage(STORAGE_KEYS.STATS, data.stats)
            }

            setIsLoading(false)
            return true
        } catch (error) {
            console.error('Error importing data:', error)
            setStorageError(`Failed to import data: ${error.message}`)
            setIsLoading(false)
            return false
        }
    }, [saveToStorage])

    /**
     * Get storage usage information
     */
    const getStorageInfo = useCallback(() => {
        try {
            let totalSize = 0
            let itemCount = 0

            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage.getItem(key).length
                    itemCount++
                }
            }

            return {
                totalSize,
                itemCount,
                usedPercentage: (totalSize / (5 * 1024 * 1024)) * 100, // Assuming 5MB limit
                isNearLimit: totalSize > (4 * 1024 * 1024) // Warn at 4MB
            }
        } catch (error) {
            console.error('Error getting storage info:', error)
            return {
                totalSize: 0,
                itemCount: 0,
                usedPercentage: 0,
                isNearLimit: false
            }
        }
    }, [])

    /**
     * Check if localStorage is available
     */
    const isStorageAvailable = useCallback(() => {
        try {
            const test = '__storage_test__'
            localStorage.setItem(test, test)
            localStorage.removeItem(test)
            return true
        } catch (error) {
            return false
        }
    }, [])

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setStorageError(null)
    }, [])

    return {
        // State
        storageError,
        isLoading,

        // Storage functions
        saveToStorage,
        loadFromStorage,
        clearFromStorage,
        clearStorage,
        exportData,
        importData,

        // Utility functions
        getStorageInfo,
        isStorageAvailable,
        clearError,

        // Constants
        STORAGE_KEYS
    }
}
