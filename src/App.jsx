import { useState, useEffect } from 'react'
import Navigation from './components/Navigation'
import Review from './components/Review'
import DeckManager from './components/DeckManager'
import ImportDecks from './components/ImportDecks'
import Stats from './components/Stats'
import { STORAGE_KEYS, saveToStorage, loadFromStorage } from './utils/storage'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('review')
  const [decks, setDecks] = useState([])
  const [activeDeck, setActiveDeck] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [reviewStats, setReviewStats] = useState({
    totalReviews: 0,
    correct: 0,
    incorrect: 0,
    streakCount: 0
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

    setDecks(savedDecks)
    setReviewStats(savedStats)
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

  // Update decks and ensure activeDeck stays in sync
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

  const renderView = () => {
    switch (currentView) {
      case 'review':
        return (
          <Review 
            deck={activeDeck} 
            onUpdateStats={setReviewStats}
            onCardReviewed={(cardId, difficulty) => {
              // Update card difficulty and last reviewed date
              if (activeDeck) {
                const updatedDecks = decks.map(deck => 
                  deck.id === activeDeck.id 
                    ? {
                        ...deck,
                        cards: deck.cards.map(card =>
                          card.id === cardId
                            ? { ...card, difficulty, lastReviewed: new Date().toISOString() }
                            : card
                        )
                      }
                    : deck
                )
                setDecks(updatedDecks)
                
                // Update active deck reference
                const updatedActiveDeck = updatedDecks.find(deck => deck.id === activeDeck.id)
                setActiveDeck(updatedActiveDeck)
              }
            }}
          />
        )
      case 'decks':
        return (
          <DeckManager 
            decks={decks} 
            onDecksChange={handleDecksChange}
            onDeckSelect={(deck) => {
              setActiveDeck(deck)
              setCurrentView('review')
            }}
          />
        )
      case 'import':
        return <ImportDecks onDecksImported={(newDecks) => {
          console.log('Received new decks:', newDecks) // Debug log
          setDecks(prev => {
            const updated = [...prev, ...newDecks]
            console.log('Updated decks array:', updated) // Debug log
            return updated
          })
        }} />
      case 'stats':
        return <Stats stats={reviewStats} decks={decks} />
      default:
        return <Review deck={activeDeck} onUpdateStats={setReviewStats} />
    }
  }

  return (
    <div className="app">
      <main className="main-content">
        {renderView()}
      </main>
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
    </div>
  )
}

export default App
