import { useState } from 'react'
import CardEditor from './CardEditor'
import styles from './DeckManager.module.css'
import { FaPlus, FaTrash, FaEdit, FaBook } from 'react-icons/fa'

const DeckManager = ({ decks, onDecksChange, onDeckSelect }) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [editingDeck, setEditingDeck] = useState(null)

  const createDeck = () => {
    if (!newDeckName.trim()) return
    
    const newDeck = {
      id: Date.now(),
      name: newDeckName.trim(),
      cards: []
    }
    
    onDecksChange(prev => [...prev, newDeck])
    setNewDeckName('')
    setShowCreateForm(false)
  }

  const deleteDeck = (deckId) => {
    if (confirm('Are you sure you want to delete this deck?')) {
      onDecksChange(prev => prev.filter(deck => deck.id !== deckId))
    }
  }

  const getDeckStats = (deck) => {
    const total = deck.cards.length
    const reviewed = deck.cards.filter(card => card.lastReviewed).length
    const mastered = deck.cards.filter(card => card.difficulty >= 3).length
    
    return { total, reviewed, mastered }
  }

  const updateDeck = (updatedDeck) => {
    onDecksChange(prev => prev.map(deck => 
      deck.id === updatedDeck.id ? updatedDeck : deck
    ))
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
      <div className={styles.header}>
        <h1>My Decks</h1>
        <button 
          className={styles.btnPrimary}
          onClick={() => setShowCreateForm(true)}
        >
          <FaPlus /> New Deck
        </button>
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
                  className={styles.btnSecondary}
                  onClick={() => setEditingDeck(deck)}
                >
                  <FaEdit /> Edit Cards
                </button>
                <button 
                  className={styles.btnPrimary}
                  onClick={() => onDeckSelect(deck)}
                  disabled={stats.total === 0}
                >
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

export default DeckManager
