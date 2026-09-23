import { Portal } from './Portal';
import { useToast } from '../context/ToastContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useStyle, useSpeech, useStorage } from '../utils';
import { FaPlus, FaTrash, FaEdit, FaImage, FaArrowLeft, FaDownload, FaCopy, FaChevronDown } from 'react-icons/fa';


/**
 * Custom hook for CardEditor logic and state management
 * Encapsulates all business logic, leaving the component as a pure view
 * 
 * @param {Object} deck - The deck object being edited
 * @param {Function} onSave - Callback when save and exit is triggered
 * @param {Function} onCancel - Callback when cancel is triggered
 * @returns {Object} All state and handlers needed by the CardEditor component
 */
const useCardEditor = (deck, onSave, onCancel) => {
  const { showWarning, showInfo } = useToast()
  const { extractImageUrl } = useSpeech()
  const { saveToStorage, STORAGE_KEYS } = useStorage()

  // Initialize cards with proper structure
  const initializeCards = useCallback(() => {
    return (deck.cards || []).map(card => {
      const strength = typeof card.memoryStrength === 'number'
        ? card.memoryStrength
        : typeof card.difficulty === 'number'
          ? card.difficulty
          : 0

      const state = card.state || (
        strength >= 80 ? 'mastered' : strength >= 55 ? 'learning' : 'new'
      )

      return {
        id: card.id || Date.now() + Math.random(),
        front: card.front || '',
        back: card.back || '',
        difficulty: strength,
        memoryStrength: strength,
        state,
        lastReviewed: card.lastReviewedAt || card.lastReviewed || null,
        lastReviewedAt: card.lastReviewedAt || card.lastReviewed || null,
        reviewCount: card.reviewCount || 0,
        correctStreak: card.correctStreak || 0,
        lapseCount: card.lapseCount || 0,
        lastResult: card.lastResult || null,
        createdAt: card.createdAt || new Date().toISOString(),
        ...card // Preserve any other properties
      }
    })
  }, [deck.cards])

  // State management
  const [cards, setCards] = useState(initializeCards)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCard, setNewCard] = useState({ front: '', back: '' })
  const [deckName, setDeckName] = useState(deck.name || '')
  const [appearance, setAppearance] = useState({
    color: '#ffffff',
    icon: '',
    textSize: 'medium',
    textVertical: 'center',
    textAlign: 'center',
    imageFit: 'fit',
    imagePosition: 'top',
    ...deck.appearance
  })
  const [tagsText, setTagsText] = useState((deck.tags || []).join(', '))
  const getTags = useCallback(() => [...new Set(tagsText.split(',').map(tag => tag.trim()).filter(Boolean))], [tagsText])

  // Auto-save with debounce to avoid excessive saves
  const debouncedSave = useCallback((cardsToSave, nameToSave = deckName, appearanceToSave = appearance, tagsToSave = getTags()) => {
    const updatedDeck = {
      ...deck,
      name: nameToSave,
      cards: cardsToSave,
      appearance: appearanceToSave,
      tags: tagsToSave
    }

    // Update the deck directly in localStorage to persist changes
    const storedDecks = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECKS) || '[]')
    const updatedDecks = storedDecks.map(d =>
      d.id === deck.id ? updatedDeck : d
    )
    saveToStorage(STORAGE_KEYS.DECKS, updatedDecks)
  }, [deck, deckName, appearance, tagsText, getTags])

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

  // Auto-save cards when they change
  useEffect(() => {
    const initialCards = initializeCards()
    const timeoutId = setTimeout(() => {
      if (cards.length !== initialCards.length || JSON.stringify(cards) !== JSON.stringify(initialCards)) {
        debouncedSave(cards)
      }
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timeoutId)
  }, [cards, debouncedSave, initializeCards])

  // Auto-save deck name changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (deckName !== deck.name) {
        debouncedSave(cards, deckName)
      }
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timeoutId)
  }, [deckName, deck.name, cards, debouncedSave])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (JSON.stringify(appearance) !== JSON.stringify(deck.appearance || {}) ||
        JSON.stringify(getTags()) !== JSON.stringify(deck.tags || [])) {
        debouncedSave(cards, deckName, appearance, getTags())
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [appearance, tagsText, deck.appearance, deck.tags, cards, deckName, debouncedSave, getTags])

  // Card management handlers
  const addCard = useCallback(() => {
    if (!newCard.front.trim() || !newCard.back.trim()) return

    const card = {
      id: Date.now(),
      front: newCard.front.trim(),
      back: newCard.back.trim(),
      difficulty: 0,
      memoryStrength: 0,
      state: 'new',
      lastReviewed: null,
      lastReviewedAt: null,
      reviewCount: 0,
      correctStreak: 0,
      lapseCount: 0,
      lastResult: null,
      createdAt: new Date().toISOString()
    }

    setCards(prev => [...prev, card])
    setNewCard({ front: '', back: '' })
    setShowAddForm(false) // Close the modal after adding
  }, [newCard])

  const updateCard = useCallback((cardId, field, value) => {
    setCards(prev => {
      const updated = prev.map(card =>
        card.id === cardId ? { ...card, [field]: value } : card
      )
      return updated
    })
  }, [])

  const deleteCard = useCallback((cardId) => {
    const cardToDelete = cards.find(card => card.id === cardId)
    setCards(prev => prev.filter(card => card.id !== cardId))
    if (cardToDelete) {
      showWarning(`Deleted card: "${cardToDelete.front}"`)
    }
  }, [cards, showWarning])

  // Modal handlers
  const openAddForm = useCallback(() => {
    setShowAddForm(true)
  }, [])

  const closeAddForm = useCallback(() => {
    setShowAddForm(false)
    setNewCard({ front: '', back: '' })
  }, [])

  const updateNewCard = useCallback((field, value) => {
    setNewCard(prev => ({ ...prev, [field]: value }))
  }, [])

  // Deck name handler
  const updateDeckName = useCallback((name) => {
    setDeckName(name)
  }, [])

  // Save and exit handler
  const handleSaveAndExit = useCallback(() => {
    const updatedDeck = {
      ...deck,
      name: deckName,
      cards,
      appearance,
      tags: getTags()
    }
    onSave(updatedDeck) // This will trigger navigation back to deck list
  }, [deck, deckName, cards, appearance, getTags, onSave])

  const copyDeckAsText = useCallback(async () => {
    const text = cards.map(card => `${card.front ?? ''}\t${card.back ?? ''}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      showInfo('Deck copied as tab-separated text.')
    } catch {
      showWarning('Clipboard access is unavailable.')
    }
  }, [cards, showInfo, showWarning])

  const downloadDeckCsv = useCallback(() => {
    const escapeCsvField = value => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = cards.map(card => `${escapeCsvField(card.front)},${escapeCsvField(card.back)}`).join('\r\n')
    const fileName = `${(deckName.trim() || 'deck').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')}.csv`
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const downloadLink = document.createElement('a')
    downloadLink.href = blobUrl
    downloadLink.download = fileName
    document.body.appendChild(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    showInfo('Deck CSV downloaded.')
  }, [cards, deckName, showInfo])

  // Computed values
  const isAddCardDisabled = !newCard.front.trim() || !newCard.back.trim()
  const cardCount = cards.length
  const hasCards = cardCount > 0

  return {
    // State
    cards,
    showAddForm,
    newCard,
    deckName,
    appearance,
    setAppearance,
    tagsText,
    setTagsText,

    // Computed values
    isAddCardDisabled,
    cardCount,
    hasCards,

    // Card management
    addCard,
    updateCard,
    deleteCard,

    // Modal management
    openAddForm,
    closeAddForm,

    // Form management
    updateNewCard,
    updateDeckName,
    // Utilities
    extractImageUrl,

    // Navigation
    handleSaveAndExit,
    copyDeckAsText,
    downloadDeckCsv
  }
}

export function CardEditor({ deck, onSave, onCancel }) {
  const [appearanceExpanded, setAppearanceExpanded] = useState(true)
  // Use the custom hook for all logic and state
  const {
    cards,
    showAddForm,
    newCard,
    deckName,
    appearance,
    setAppearance,
    tagsText,
    setTagsText,
    isAddCardDisabled,
    cardCount,
    hasCards,
    addCard,
    updateCard,
    deleteCard,
    openAddForm,
    closeAddForm,
    updateNewCard,
    updateDeckName,
    handleSaveAndExit,
    copyDeckAsText,
    downloadDeckCsv,
    extractImageUrl
  } = useCardEditor(deck, onSave, onCancel)

  // Custom styles for CardEditor
  const customStyles = {
    cardEditor: 'p-4 max-w-5xl mx-auto flex flex-col gap-6 md:p-8 md:gap-8',
    header: 'flex flex-col items-stretch gap-4 md:flex-row md:justify-between md:items-center md:flex-wrap',
    backButton: 'flex items-center gap-2 py-2 px-4 text-sm font-medium text-gray-600 transition-all duration-200 hover:text-blue-600 hover:-translate-x-0.5',
    // allow the header content to shrink inside a flex row (prevents overflow)
    headerContent: 'flex flex-col gap-1 min-w-0 flex-1',
    // make the deck name input responsive: full width but constrained on larger screens
    nameInput: 'w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-normal text-gray-900 placeholder:text-gray-400',
    headerDescription: 'text-gray-600 text-base',
    addCardSection: 'flex justify-center py-6',
    addCardSectionBottom: 'flex justify-center py-8 px-6 border-t border-gray-200 mt-6',
    addCardBtn: 'py-2 px-6 text-sm font-medium flex items-center gap-2',
    modalOverlay: 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden',
    addCardModal: 'w-full max-h-[80vh] overflow-y-auto p-8 bg-white bg-opacity-95 backdrop-blur-3xl rounded-2xl border border-white border-opacity-30 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 md:max-w-3xl md:p-12 md:rounded-3xl',
    modalTitle: 'text-xl font-bold text-gray-900 text-center mb-8 md:text-2xl',
    formRow: 'grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 md:gap-6',
    formGroup: 'flex flex-col gap-2',
    formLabel: 'font-semibold text-gray-900 text-sm uppercase tracking-wide',
    formTextarea: 'p-4 border-2 border-gray-300 rounded-lg bg-white/80 text-gray-900 text-base resize-vertical min-h-20 transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:bg-white focus:shadow-sm focus:-translate-y-0.5 hover:border-indigo-400',
  imagePreview: 'flex items-center gap-3 mt-2 px-3 py-2 bg-white/80 border border-gray-200 rounded-lg text-sm text-gray-700',
  imagePreviewThumb: 'w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0',
  imagePreviewText: 'flex items-center gap-2',
    formActions: 'flex flex-col gap-2 justify-center pt-6 border-t border-gray-200 md:flex-row md:gap-4',
  // make the list a scrollable container so virtualization can measure and manage visible items
  // make the list a scrollable container so virtualization can measure and manage visible items
  // increased height and width on md+ to give the virtual view more room
  cardsList: 'relative overflow-auto max-h-[85vh] min-h-[60vh] touch-manipulation space-y-6 w-full max-w-4xl mx-auto pb-32 hide-scrollbar',
  cardItem: 'p-6 bg-white/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-md grid grid-cols-1 gap-4 items-start transition-all duration-200 relative hover:shadow-lg md:grid-cols-[auto,1fr] md:gap-6 md:p-8',
  cardNumber: 'font-bold text-white bg-blue-500 rounded-full w-10 h-10 flex items-center justify-center text-lg mx-auto mb-4 self-center md:mx-0 md:mr-4',
  cardContent: 'grid grid-cols-1 gap-4 w-full md:grid-cols-2 md:gap-6 min-w-0',
  cardSide: 'flex flex-col gap-2 min-w-0',
  cardSideLabel: 'font-semibold text-gray-700 text-sm uppercase tracking-wide',
  cardSideTextarea: 'p-4 border border-gray-200 rounded-lg bg-white text-gray-900 text-base resize-vertical min-h-24 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-300',
  deleteCardBtn: 'text-lg p-2 rounded-md bg-white/60 text-red-600 hover:bg-red-50 transition-all duration-200 flex items-center justify-center min-w-10 min-h-10 absolute top-3 right-3 md:top-4 md:right-4',
    emptyState: 'text-center py-16 mx-auto max-w-96 flex flex-col items-center justify-center',
    emptyIcon: 'text-6xl mb-6 text-blue-600 opacity-70',
    emptyTitle: 'text-2xl mb-4 text-gray-900 font-semibold',
    emptyDescription: 'text-gray-600 text-base leading-relaxed'
  }

  const baseStyles = useStyle()
  const styles = { ...baseStyles, cardEditor: customStyles }

  // --- Virtualization setup ---
  // Assumption: card items have approximately fixed height. Using a fixed ITEM_HEIGHT simplifies virtualization without extra dependencies.
  const listRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  // ITEM_HEIGHT includes the card height plus the vertical gap created by `space-y-6` (~24px)
  const ITEM_HEIGHT = 384 // px - tuned for card layout (adjustable)
  const OVERSCAN = 3

  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const handleResize = () => {
      setContainerHeight(el.clientHeight || 600)
    }

    const onScroll = (e) => setScrollTop(e.target.scrollTop)

    // Use ResizeObserver when available to track container size changes
    let ro
    try {
      ro = new ResizeObserver(handleResize)
      ro.observe(el)
    } catch (err) {
      window.addEventListener('resize', handleResize)
    }

    el.addEventListener('scroll', onScroll)
    handleResize()

    return () => {
      el.removeEventListener('scroll', onScroll)
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', handleResize)
    }
  }, [listRef.current, cards.length])

  const totalHeight = cards.length * ITEM_HEIGHT
  const visibleCount = Math.max(1, Math.ceil(containerHeight / ITEM_HEIGHT))
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(cards.length, startIndex + visibleCount + OVERSCAN * 2)
  const visibleCards = cards.slice(startIndex, endIndex)
  // --- end virtualization ---

  return (
    <div className={styles.cardEditor.cardEditor}>
      <div className={styles.cardEditor.header}>
        <button className={`${styles.cardEditor.backButton} ${styles.button.secondary}`} onClick={handleSaveAndExit}>
          <FaArrowLeft /> 
        </button>
        <div className={styles.cardEditor.headerContent}>
          <p className={styles.cardEditor.headerDescription}>{cardCount} cards • Auto-saved</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={styles.button.secondary} onClick={copyDeckAsText}>
            <FaCopy /> Copy as text
          </button>
          <button type="button" className={styles.button.secondary} onClick={downloadDeckCsv}>
            <FaDownload /> Download CSV
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm md:p-6">
        <button
          type="button"
          className="mb-4 flex w-full items-center justify-between text-left"
          onClick={() => setAppearanceExpanded(expanded => !expanded)}
          aria-expanded={appearanceExpanded}
          aria-controls="deck-appearance-options"
        >
          <h2 className="text-lg font-semibold text-gray-900">Deck Appearance</h2>
          <FaChevronDown className={`transition-transform ${appearanceExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {appearanceExpanded && <div id="deck-appearance-options" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 sm:col-span-2 lg:col-span-3">
            Deck name
            <input
              type="text"
              value={deckName}
              onChange={e => updateDeckName(e.target.value)}
              className={styles.cardEditor.nameInput}
              placeholder="Deck name..."
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">Deck icon</legend>
            <input value={appearance.icon} onChange={e => setAppearance(prev => ({ ...prev, icon: e.target.value }))} placeholder="Choose an emoji" aria-label="Deck emoji icon" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            <span className="mt-1 block text-xs font-normal text-gray-500">Press Win + . while focused to open the emoji picker.</span>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">Card text size</legend>
            <select value={appearance.textSize || 'medium'} onChange={e => setAppearance(prev => ({ ...prev, textSize: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="extraSmall">Extra small</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="extraLarge">Extra large</option>
            </select>
          </fieldset>
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Text alignment
            <select value={appearance.textAlign} onChange={e => setAppearance(prev => ({ ...prev, textAlign: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2">
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Text position
            <select value={appearance.textVertical} onChange={e => setAppearance(prev => ({ ...prev, textVertical: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2">
              <option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Image sizing
            <select value={appearance.imageFit} onChange={e => setAppearance(prev => ({ ...prev, imageFit: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2">
              <option value="fit">Fit whole image</option><option value="fill">Fill image area</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Image position
            <select value={appearance.imagePosition} onChange={e => setAppearance(prev => ({ ...prev, imagePosition: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2">
              <option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700 sm:col-span-2 lg:col-span-3">
            Tags (comma separated)
            <input value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="e.g. biology, exam 1" className="rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <fieldset className="sm:col-span-2 lg:col-span-3">
            <legend className="mb-2 text-sm font-medium text-gray-700">Deck color</legend>
            <div className="flex flex-wrap gap-1.5">
              {[
                ['#ffffff', 'White'], ['#0B1026', 'Midnight navy'], ['#1A1F47', 'Navy'], ['#2D3EB3', 'Royal indigo'], ['#3F51B5', 'Indigo'],
                ['#5C6BC0', 'Periwinkle'], ['#7986CB', 'Soft indigo'], ['#9FA8DA', 'Lavender blue'], ['#B3E5FC', 'Light blue'],
                ['#4DD0E1', 'Cyan'], ['#26C6DA', 'Turquoise'], ['#00BFA5', 'Teal'], ['#00C853', 'Green'],
                ['#69F0AE', 'Mint'], ['#B2FF59', 'Lime'], ['#EEFF41', 'Lemon'], ['#FFD54F', 'Amber'],
                ['#FFB74D', 'Orange'], ['#FF8A65', 'Coral'], ['#F44336', 'Red'], ['#D32F2F', 'Dark red'],
                ['#8D1B1B', 'Wine'], ['#6D4037', 'Brown'], ['#8D6E63', 'Warm gray'], ['#D45A78', 'Rose'], ['#AB47BC', 'Purple']
              ].map(([color, label]) => (
                <button key={color} type="button" title={label} aria-label={`${label} deck color`} aria-pressed={appearance.color === color} onClick={() => setAppearance(prev => ({ ...prev, color }))} className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform ${appearance.color === color ? 'z-10 scale-110 border-white ring-2 ring-gray-900' : 'border-gray-300 hover:scale-110'}`} style={{ backgroundColor: color }}>
                  {appearance.color === color && <span className="text-sm font-bold leading-none text-white" style={{ textShadow: '0 1px 3px #000, 1px 0 2px #000, -1px 0 2px #000' }}>✓</span>}
                </button>
              ))}
            </div>
          </fieldset>
        </div>}
      </section>

      <div className={styles.cardEditor.addCardSection}>
        <button
          className={styles.button.primary}
          onClick={openAddForm}
        >
          <FaPlus /> Add New Card
        </button>
      </div>

      {/* Add Card Modal */}
      {showAddForm && (
        <Portal>
          <div className={styles.cardEditor.modalOverlay} onClick={closeAddForm}>
            <div className={styles.cardEditor.addCardModal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.cardEditor.modalTitle}>Add New Card</h3>
              <div className={styles.cardEditor.formRow}>
                <div className={styles.cardEditor.formGroup}>
                  <label className={styles.cardEditor.formLabel}>Front (Question)</label>
                  <textarea
                    value={newCard.front}
                    onChange={(e) => updateNewCard('front', e.target.value)}
                    placeholder="Enter the question or prompt... (URLs supported: images, audio, video, etc.)"
                    rows={3}
                    className={styles.cardEditor.formTextarea}
                  />
                  {extractImageUrl(newCard.front) && (
                    <div className={styles.cardEditor.imagePreview}>
                      <img
                        src={extractImageUrl(newCard.front)}
                        alt="Preview"
                        className={styles.cardEditor.imagePreviewThumb}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <div className={styles.cardEditor.imagePreviewText}>
                        <FaImage />
                        <span>Image URL detected</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.cardEditor.formGroup}>
                  <label className={styles.cardEditor.formLabel}>Back (Answer)</label>
                  <textarea
                    value={newCard.back}
                    onChange={(e) => updateNewCard('back', e.target.value)}
                    placeholder="Enter the answer... (URLs supported: images, audio, video, etc.)"
                    rows={3}
                    className={styles.cardEditor.formTextarea}
                  />
                  {extractImageUrl(newCard.back) && (
                    <div className={styles.cardEditor.imagePreview}>
                      <img
                        src={extractImageUrl(newCard.back)}
                        alt="Preview"
                        className={styles.cardEditor.imagePreviewThumb}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <div className={styles.cardEditor.imagePreviewText}>
                        <FaImage />
                        <span>Image URL detected</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.cardEditor.formActions}>
                <button
                  className={styles.button.primary}
                  onClick={addCard}
                  disabled={isAddCardDisabled}
                >
                  Add Card
                </button>
                <button className={`${styles.button.secondary} justify-center`} onClick={closeAddForm}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <div ref={listRef} className={styles.cardEditor.cardsList}>
        <div style={{ height: startIndex * ITEM_HEIGHT }} />
        {visibleCards.map((card, idx) => {
          const actualIndex = startIndex + idx
          return (
            <div key={card.id} className={styles.cardEditor.cardItem} style={{ transform: `translateY(0)` }}>
              <div className={styles.cardEditor.cardNumber}>#{actualIndex + 1}</div>
              <div className={styles.cardEditor.cardContent}>
                <div className={styles.cardEditor.cardSide}>
                  <label className={styles.cardEditor.cardSideLabel}>Front</label>
                  <textarea
                    value={card.front || ''}
                    onChange={(e) => updateCard(card.id, 'front', e.target.value)}
                    rows={3}
                    placeholder="Text and/or URLs (images, audio, video, etc.)"
                    className={styles.cardEditor.cardSideTextarea}
                  />
                  {extractImageUrl(card.front) && (
                    <div className={styles.cardEditor.imagePreview}>
                      <img
                        src={extractImageUrl(card.front)}
                        alt="Preview"
                        className={styles.cardEditor.imagePreviewThumb}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <div className={styles.cardEditor.imagePreviewText}>
                        <FaImage />
                        <span>Image URL detected</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.cardEditor.cardSide}>
                  <label className={styles.cardEditor.cardSideLabel}>Back</label>
                  <textarea
                    value={card.back || ''}
                    onChange={(e) => updateCard(card.id, 'back', e.target.value)}
                    rows={3}
                    placeholder="Text and/or URLs (images, audio, video, etc.)"
                    className={styles.cardEditor.cardSideTextarea}
                  />
                  {extractImageUrl(card.back) && (
                    <div className={styles.cardEditor.imagePreview}>
                      <img
                        src={extractImageUrl(card.back)}
                        alt="Preview"
                        className={styles.cardEditor.imagePreviewThumb}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <div className={styles.cardEditor.imagePreviewText}>
                        <FaImage />
                        <span>Image URL detected</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                className={styles.cardEditor.deleteCardBtn}
                onClick={() => deleteCard(card.id)}
              >
                <FaTrash />
              </button>
            </div>
          )
        })}
        <div style={{ height: Math.max(0, (cards.length - endIndex) * ITEM_HEIGHT) }} />
      </div>

  {/* Add card button moved to top; bottom button removed to reduce visual noise */}

      {!hasCards && (
        <div className={styles.cardEditor.emptyState}>
          <div className={styles.cardEditor.emptyIcon}><FaEdit /></div>
          <h2 className={styles.cardEditor.emptyTitle}>No Cards Yet</h2>
          <p className={styles.cardEditor.emptyDescription}>Add your first card to get started!</p>
        </div>
      )}
    </div>
  )
}
