import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../context/ToastContext'
import styles from './CardEditor.module.css'
import { FaPlus, FaTrash, FaEdit, FaImage, FaArrowLeft } from 'react-icons/fa'
import { extractImageUrl } from '../utils/speechUtils'
import Portal from './Portal'

const CardEditor = ({ deck, onSave, onCancel }) => {
  const { showWarning, showInfo } = useToast()
  
  // Ensure deck.cards exists and is an array, with proper card structure
  const initialCards = (deck.cards || []).map(card => ({
    id: card.id || Date.now() + Math.random(),
    front: card.front || '',
    back: card.back || '',
    difficulty: card.difficulty || 0,
    lastReviewed: card.lastReviewed || null,
    ...card // Preserve any other properties
  }))
  
  const [cards, setCards] = useState(initialCards)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCard, setNewCard] = useState({ front: '', back: '' })
  const [deckName, setDeckName] = useState(deck.name || '')

  // Handle modal positioning on mobile
  useEffect(() => {
    if (showAddForm) {
      // Disable body scroll when modal is open
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${window.scrollY}px`
      document.body.style.width = '100%'
    } else {
      // Re-enable body scroll and restore position
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [showAddForm])

  // Auto-save with debounce to avoid excessive saves
  const debouncedSave = useCallback((cardsToSave, nameToSave = deckName) => {
    const updatedDeck = {
      ...deck,
      name: nameToSave,
      cards: cardsToSave
    }
    // Update the deck in the parent's context/state without navigating
    // We'll save to localStorage or context directly instead of calling onSave
    
    // Update the deck directly in localStorage to persist changes
    const storedDecks = JSON.parse(localStorage.getItem('deckster_decks') || '[]')
    const updatedDecks = storedDecks.map(d => 
      d.id === deck.id ? updatedDeck : d
    )
    localStorage.setItem('deckster_decks', JSON.stringify(updatedDecks))
  }, [deck, deckName])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (cards.length !== initialCards.length || JSON.stringify(cards) !== JSON.stringify(initialCards)) {
        debouncedSave(cards)
      }
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timeoutId)
  }, [cards, debouncedSave, initialCards])

  // Auto-save deck name changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (deckName !== deck.name) {
        debouncedSave(cards, deckName)
      }
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timeoutId)
  }, [deckName, deck.name, cards, debouncedSave])

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
    setShowAddForm(false) // Close the modal after adding
  }

  const updateCard = (cardId, field, value) => {
    setCards(prev => {
      const updated = prev.map(card =>
        card.id === cardId ? { ...card, [field]: value } : card
      )
      return updated
    })
  }

  const deleteCard = (cardId) => {
    const cardToDelete = cards.find(card => card.id === cardId)
    setCards(prev => prev.filter(card => card.id !== cardId))
    if (cardToDelete) {
      showWarning(`Deleted card: "${cardToDelete.front}"`)
    }
  }

  const handleSaveAndExit = () => {
    const updatedDeck = {
      ...deck,
      name: deckName,
      cards: cards
    }
    onSave(updatedDeck) // This will trigger navigation back to deck list
  }

  return (
    <div className={styles.cardEditor}>
      <div className={styles.header}>
        <button className={`${styles.backButton} btn-ghost`} onClick={handleSaveAndExit}>
          <FaArrowLeft /> Back to Decks
        </button>
        <div className={styles.headerContent}>
          <div className={styles.nameEditContainer}>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className={styles.nameInput}
              placeholder="Deck name..."
            />
          </div>
          <p>{cards.length} cards • Auto-saved</p>
        </div>
      </div>

      <div className={styles.addCardSection}>
        <button 
          className={`${styles.addCardBtn} btn-primary`}
          onClick={() => setShowAddForm(true)}
        >
          <FaPlus /> Add New Card
        </button>
      </div>

      {/* Add Card Modal */}
      {showAddForm && (
        <Portal>
          <div className={styles.modalOverlay} onClick={() => setShowAddForm(false)}>
            <div className={styles.addCardModal} onClick={(e) => e.stopPropagation()}>
              <h3>Add New Card</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Front (Question)</label>
                  <textarea
                    value={newCard.front}
                    onChange={(e) => setNewCard(prev => ({ ...prev, front: e.target.value }))}
                    placeholder="Enter the question or prompt... (URLs supported: images, audio, video, etc.)"
                    rows={3}
                  />
                  {extractImageUrl(newCard.front) && (
                    <div className={styles.imagePreview}>
                      <img 
                        src={extractImageUrl(newCard.front)} 
                        alt="Preview" 
                        className={styles.imagePreviewThumb}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <div className={styles.imagePreviewText}>
                        <FaImage />
                        <span>Image URL detected</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Back (Answer)</label>
                  <textarea
                    value={newCard.back}
                    onChange={(e) => setNewCard(prev => ({ ...prev, back: e.target.value }))}
                    placeholder="Enter the answer... (URLs supported: images, audio, video, etc.)"
                    rows={3}
                  />
                  {extractImageUrl(newCard.back) && (
                    <div className={styles.imagePreview}>
                      <img 
                        src={extractImageUrl(newCard.back)} 
                        alt="Preview" 
                        className={styles.imagePreviewThumb}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <div className={styles.imagePreviewText}>
                        <FaImage />
                        <span>Image URL detected</span>
                      </div>
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
          </div>
        </Portal>
      )}

      <div className={styles.cardsList}>
        {cards.map((card, index) => (
          <div key={card.id} className={`${styles.cardItem} glass rounded-lg`}>
            <div className={styles.cardNumber}>#{index + 1}</div>
            <div className={styles.cardContent}>
              <div className={styles.cardSide}>
                <label>Front</label>
                <textarea
                  value={card.front || ''}
                  onChange={(e) => updateCard(card.id, 'front', e.target.value)}
                  rows={3}
                  placeholder="Text and/or URLs (images, audio, video, etc.)"
                />
                {extractImageUrl(card.front) && (
                  <div className={styles.imagePreview}>
                    <img 
                      src={extractImageUrl(card.front)} 
                      alt="Preview" 
                      className={styles.imagePreviewThumb}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <div className={styles.imagePreviewText}>
                      <FaImage />
                      <span>Image URL detected</span>
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.cardSide}>
                <label>Back</label>
                <textarea
                  value={card.back || ''}
                  onChange={(e) => updateCard(card.id, 'back', e.target.value)}
                  rows={3}
                  placeholder="Text and/or URLs (images, audio, video, etc.)"
                />
                {extractImageUrl(card.back) && (
                  <div className={styles.imagePreview}>
                    <img 
                      src={extractImageUrl(card.back)} 
                      alt="Preview" 
                      className={styles.imagePreviewThumb}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <div className={styles.imagePreviewText}>
                      <FaImage />
                      <span>Image URL detected</span>
                    </div>
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

      {/* Add card button at the end of the list */}
      {cards.length > 0 && (
        <div className={styles.addCardSectionBottom}>
          <button 
            className={`${styles.addCardBtn} btn-primary`}
            onClick={() => setShowAddForm(true)}
          >
            <FaPlus /> Add New Card
          </button>
        </div>
      )}

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
