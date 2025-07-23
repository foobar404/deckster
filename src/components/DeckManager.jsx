import { useState } from 'react'
import CardEditor from './CardEditor'
import './DeckManager.css'

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
    <div className="deck-manager">
      <div className="header">
        <h1>My Decks</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ New Deck
        </button>
      </div>

      {showCreateForm && (
        <div className="create-form glass rounded-lg">
          <h3>Create New Deck</h3>
          <input
            type="text"
            placeholder="Deck name..."
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createDeck()}
            autoFocus
          />
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={createDeck}>
              Create
            </button>
          </div>
        </div>
      )}

      <div className="decks-grid">
        {decks.map(deck => {
          const stats = getDeckStats(deck)
          const progress = stats.total > 0 ? (stats.reviewed / stats.total) * 100 : 0
          
          return (
            <div key={deck.id} className="deck-card glass rounded-lg">
              <div className="deck-header">
                <h3 className="deck-name">{deck.name}</h3>
                <button 
                  className="delete-btn btn-ghost"
                  onClick={() => deleteDeck(deck.id)}
                >
                  🗑️
                </button>
              </div>
              
              <div className="deck-stats">
                <div className="stat-row">
                  <span>Cards:</span>
                  <span>{stats.total}</span>
                </div>
                <div className="stat-row">
                  <span>Reviewed:</span>
                  <span>{stats.reviewed}</span>
                </div>
                <div className="stat-row">
                  <span>Mastered:</span>
                  <span>{stats.mastered}</span>
                </div>
              </div>
              
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">{Math.round(progress)}% complete</span>
              </div>
              
              <div className="deck-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setEditingDeck(deck)}
                >
                  ✏️ Edit Cards
                </button>
                <button 
                  className="btn-primary"
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
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>No Decks Yet</h2>
          <p>Create your first deck to start studying!</p>
        </div>
      )}
    </div>
  )
}

export default DeckManager
