import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import styles from './CardEditor.module.css'
import { FaPlus, FaTrash, FaEdit, FaImage } from 'react-icons/fa'
import { extractImageUrl } from '../utils/speechUtils'

const CardEditor = ({ deck, onSave, onCancel }) => {
  const { showWarning, showInfo } = useToast()
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
    const cardToDelete = cards.find(card => card.id === cardId)
    setCards(prev => prev.filter(card => card.id !== cardId))
    if (cardToDelete) {
      showWarning(`Deleted card: "${cardToDelete.front}"`)
    }
  }

  const handleSave = () => {
    const updatedDeck = {
      ...deck,
      cards: cards.filter(card => card.front.trim() && card.back.trim())
    }
    onSave(updatedDeck)
    showInfo(`Saved changes to "${deck.name}"`)
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
                  placeholder="Enter the question or prompt... (You can include image URLs)"
                  rows={3}
                />
                {extractImageUrl(newCard.front) && (
                  <div className={styles.imagePreview}>
                    <FaImage />
                    <span>Image detected in text</span>
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Back (Answer)</label>
                <textarea
                  value={newCard.back}
                  onChange={(e) => setNewCard(prev => ({ ...prev, back: e.target.value }))}
                  placeholder="Enter the answer... (You can include image URLs)"
                  rows={3}
                />
                {extractImageUrl(newCard.back) && (
                  <div className={styles.imagePreview}>
                    <FaImage />
                    <span>Image detected in text</span>
                  </div>
                )}
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
                  rows={3}
                  placeholder="Text and/or image URL (https://...)"
                />
                {extractImageUrl(card.front) && (
                  <div className={styles.imagePreview}>
                    <FaImage />
                    <span>Image detected</span>
                  </div>
                )}
              </div>
              <div className={styles.cardSide}>
                <label>Back</label>
                <textarea
                  value={card.back}
                  onChange={(e) => updateCard(card.id, 'back', e.target.value)}
                  rows={3}
                  placeholder="Text and/or image URL (https://...)"
                />
                {extractImageUrl(card.back) && (
                  <div className={styles.imagePreview}>
                    <FaImage />
                    <span>Image detected</span>
                  </div>
                )}
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
