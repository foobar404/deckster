import { useState } from 'react'
import styles from './CardEditor.module.css'
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa'

const CardEditor = ({ deck, onSave, onCancel }) => {
  const [cards, setCards] = useState([...deck.cards])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCard, setNewCard] = useState({ front: '', back: '' })

  const addCard = () => {
    if (!newCard.front.trim() || !newCard.back.trim()) return
    
    const card = {
      id: Date.now(),
      front: newCard.front.trim(),
      back: newCard.back.trim(),
      difficulty: 0,
      lastReviewed: null
    }
    
    setCards(prev => [...prev, card])
    setNewCard({ front: '', back: '' })
    setShowAddForm(false)
  }

  const updateCard = (cardId, field, value) => {
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, [field]: value } : card
    ))
  }

  const deleteCard = (cardId) => {
    if (confirm('Are you sure you want to delete this card?')) {
      setCards(prev => prev.filter(card => card.id !== cardId))
    }
  }

  const handleSave = () => {
    const updatedDeck = {
      ...deck,
      cards: cards.filter(card => card.front.trim() && card.back.trim())
    }
    onSave(updatedDeck)
  }

  return (
    <div className={styles.cardEditor}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Edit Cards - {deck.name}</h1>
          <p>{cards.length} cards</p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>

      <div className={styles.addCardSection}>
        {!showAddForm ? (
          <button 
            className={`${styles.addCardBtn} btn-primary`}
            onClick={() => setShowAddForm(true)}
          >
            <FaPlus /> Add New Card
          </button>
        ) : (
          <div className={`styles.addCardForm glass rounded-lg`}>
            <h3>Add New Card</h3>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Front (Question)</label>
                <textarea
                  value={newCard.front}
                  onChange={(e) => setNewCard(prev => ({ ...prev, front: e.target.value }))}
                  placeholder="Enter the question or prompt..."
                  rows={2}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Back (Answer)</label>
                <textarea
                  value={newCard.back}
                  onChange={(e) => setNewCard(prev => ({ ...prev, back: e.target.value }))}
                  placeholder="Enter the answer..."
                  rows={2}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button className="btn-secondary" onClick={() => {
                setShowAddForm(false)
                setNewCard({ front: '', back: '' })
              }}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={addCard}
                disabled={!newCard.front.trim() || !newCard.back.trim()}
              >
                Add Card
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.cardsList}>
        {cards.map((card, index) => (
          <div key={card.id} className={`${styles.cardItem} glass rounded-lg`}>
            <div className={styles.cardNumber}>#{index + 1}</div>
            <div className={styles.cardContent}>
              <div className={styles.cardSide}>
                <label>Front</label>
                <textarea
                  value={card.front}
                  onChange={(e) => updateCard(card.id, 'front', e.target.value)}
                  rows={2}
                />
              </div>
              <div className={styles.cardSide}>
                <label>Back</label>
                <textarea
                  value={card.back}
                  onChange={(e) => updateCard(card.id, 'back', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <button 
              className={`${styles.deleteCardBtn} btn-ghost`}
              onClick={() => deleteCard(card.id)}
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><FaEdit /></div>
          <h2>No Cards Yet</h2>
          <p>Add your first card to get started!</p>
        </div>
      )}
    </div>
  )
}

export default CardEditor
