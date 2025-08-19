import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import CardEditor from '../components/CardEditor'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { FaPlus, FaTrash, FaEdit, FaBook, FaCog, FaRandom, FaExclamationTriangle, FaTimes } from 'react-icons/fa'
import styles from '../components/DeckManager.module.css'

const DecksPage = () => {
  const navigate = useNavigate()
  const { decks, setDecks, setActiveDeck, studyOptions, setStudyOptions } = useContext(AppContext)
  const { showInfo, showWarning } = useToast()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [editingDeck, setEditingDeck] = useState(null)
  const [showOptions, setShowOptions] = useState(false)

  const createDeck = () => {
    if (!newDeckName.trim()) return
    
    const newDeck = {
      id: Date.now(),
      name: newDeckName.trim(),
      cards: []
    }
    
    setDecks(prev => [...prev, newDeck])
    setNewDeckName('')
    setShowCreateForm(false)
    showInfo(`Created new deck "${newDeck.name}"`)
  }

  const deleteDeck = (deckId) => {
    const deckToDelete = decks.find(deck => deck.id === deckId)
    if (deckToDelete) {
      setDecks(prev => prev.filter(deck => deck.id !== deckId))
      showWarning(`Deleted deck "${deckToDelete.name}"`)
    }
  }

  const getDeckStats = (deck) => {
    const total = deck.cards.length
    const reviewed = deck.cards.filter(card => card.lastReviewed).length
    const mastered = deck.cards.filter(card => card.difficulty >= 3).length
    
    return { total, reviewed, mastered }
  }

  const updateDeck = (updatedDeck) => {
    console.log('Updating deck in DecksPage:', updatedDeck)
    setDecks(prev => {
      const updated = prev.map(deck => 
        deck.id === updatedDeck.id ? updatedDeck : deck
      )
      console.log('Updated decks array:', updated)
      return updated
    })
  }

  const handleDeckSelect = (deck) => {
    setActiveDeck(deck)
    navigate('/review')
  }

  if (editingDeck) {
    return (
      <CardEditor 
        deck={editingDeck}
        onSave={(updatedDeck) => {
          updateDeck(updatedDeck)
          setEditingDeck(null) // Go back to deck list
        }}
        onCancel={() => setEditingDeck(null)}
      />
    )
  }

  return (
    <div className={styles.deckManager}>
      {/* Study Options Modal */}
      {showOptions && (
        <div className={styles.optionsModal} onClick={() => setShowOptions(false)}>
          <div className={`${styles.optionsContent} rounded-lg`} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeButton}
              onClick={() => setShowOptions(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h3>Study Options</h3>
            
            <div className={styles.optionGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={studyOptions.randomOrder}
                  onChange={(e) => setStudyOptions(prev => ({ ...prev, randomOrder: e.target.checked }))}
                />
                <FaRandom /> Shuffle Cards
              </label>
            </div>
            
            <div className={styles.optionGroup}>
              <label>Card Direction:</label>
              <div className={styles.radioGroup}>
                <label>
                  <input
                    type="radio"
                    value="front-to-back"
                    checked={studyOptions.direction === 'front-to-back'}
                    onChange={(e) => setStudyOptions(prev => ({ ...prev, direction: e.target.value }))}
                  />
                  Front → Back
                </label>
                <label>
                  <input
                    type="radio"
                    value="back-to-front"
                    checked={studyOptions.direction === 'back-to-front'}
                    onChange={(e) => setStudyOptions(prev => ({ ...prev, direction: e.target.value }))}
                  />
                  Back → Front
                </label>
                <label>
                  <input
                    type="radio"
                    value="random"
                    checked={studyOptions.direction === 'random'}
                    onChange={(e) => setStudyOptions(prev => ({ ...prev, direction: e.target.value }))}
                  />
                  <FaRandom /> Mixed Direction
                </label>
              </div>
            </div>
            
            <div className={styles.optionGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={studyOptions.onlyMissed}
                  onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyMissed: e.target.checked }))}
                />
                <FaExclamationTriangle /> Focus on Missed Cards
              </label>
            </div>
            
            <div className={styles.optionGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={studyOptions.showBothSides}
                  onChange={(e) => setStudyOptions(prev => ({ ...prev, showBothSides: e.target.checked }))}
                />
                Show Both Sides When Flipped
              </label>
            </div>
            
            <div className={styles.optionActions}>
              {/* Close button removed - using X in top right instead */}
            </div>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <h1>My Decks</h1>
        <div className={styles.headerActions}>
          <button 
            className={`${styles.optionsBtn} btn btn--ghost`}
            onClick={() => setShowOptions(true)}
            title="Study Options"
          >
            <FaCog />
          </button>
          <button 
            className={styles.btnPrimary}
            onClick={() => setShowCreateForm(true)}
          >
            <FaPlus /> New Deck
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className={`${styles.createForm} glass rounded-lg`}>
          <h3>Create New Deck</h3>
          <input
            type="text"
            placeholder="Deck name..."
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createDeck()}
            autoFocus
          />
          <div className={styles.formActions}>
            <button className={styles.btnSecondary} onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
            <button className={styles.btnPrimary} onClick={createDeck}>
              Create
            </button>
          </div>
        </div>
      )}

      <div className={styles.decksGrid}>
        {decks.map(deck => {
          const stats = getDeckStats(deck)
          const progress = stats.total > 0 ? (stats.reviewed / stats.total) * 100 : 0
          
          return (
            <div key={deck.id} className={`${styles.deckCard} glass rounded-lg`}>
              <div className={styles.deckHeader}>
                <h3 className={styles.deckName}>{deck.name}</h3>
                <button 
                  className={`${styles.deleteBtn} btn-ghost`}
                  onClick={() => deleteDeck(deck.id)}
                >
                  <FaTrash />
                </button>
              </div>
              
              <div className={styles.deckStats}>
                <div className={styles.statRow}>
                  <span>Cards:</span>
                  <span>{stats.total}</span>
                </div>
                <div className={styles.statRow}>
                  <span>Reviewed:</span>
                  <span>{stats.reviewed}</span>
                </div>
                <div className={styles.statRow}>
                  <span>Mastered:</span>
                  <span>{stats.mastered}</span>
                </div>
              </div>
              
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className={styles.progressText}>{Math.round(progress)}% complete</span>
              </div>
              
              <div className={styles.deckActions}>
                <button 
                  className={`${styles.btnSecondary} btn btn--secondary btn--large`}
                  onClick={() => setEditingDeck(deck)}
                >
                  <FaEdit /> Edit
                </button>
                <button 
                  className={`${styles.btnPrimary} btn btn--primary btn--large`}
                  onClick={() => handleDeckSelect(deck)}
                  disabled={stats.total === 0}
                >
                  <FaBook />
                  {stats.total === 0 ? 'No Cards' : 'Study'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {decks.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><FaBook /></div>
          <h2>No Decks Yet</h2>
          <p>Create your first deck to start studying!</p>
        </div>
      )}
    </div>
  )
}

export default DecksPage
