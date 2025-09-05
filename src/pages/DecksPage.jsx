import { useStyle } from '../utils'
import { useNavigate } from 'react-router-dom'
import { useState, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Portal } from '../components/Portal'
import { CardEditor } from '../components/CardEditor'
import { FaPlus, FaTrash, FaEdit, FaBook, FaCog, FaRandom, FaExclamationTriangle, FaTimes } from 'react-icons/fa'

/**
 * Custom hook for DecksPage logic and state management
 * @returns {Object} All state and handlers needed by the DecksPage component
 */
const useDecksPage = () => {
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

    // Calculate study cards based on current options
    let studyCount = total
    if (studyOptions.onlyMissed) {
      const missedCards = deck.cards.filter(card => card.difficulty < 2)
      studyCount = missedCards.length > 0 ? missedCards.length : total
    }
    
    // Apply card limit if set
    if (studyOptions.cardLimit && studyOptions.cardLimit > 0) {
      studyCount = Math.min(studyCount, studyOptions.cardLimit)
    }

    return { total, reviewed, mastered, studyCount }
  }

  const updateDeck = (updatedDeck) => {
    setDecks(prev => {
      const updated = prev.map(deck =>
        deck.id === updatedDeck.id ? updatedDeck : deck
      )
      return updated
    })
  }

  const handleDeckSelect = (deck) => {
    setActiveDeck(deck)
    navigate('/review')
  }

  return {
    navigate,
    decks,
    setDecks,
    setActiveDeck,
    studyOptions,
    setStudyOptions,
    showInfo,
    showWarning,
    showCreateForm,
    setShowCreateForm,
    newDeckName,
    setNewDeckName,
    editingDeck,
    setEditingDeck,
    showOptions,
    setShowOptions,
    createDeck,
    deleteDeck,
    getDeckStats,
    updateDeck,
    handleDeckSelect
  }
}

export function DecksPage() {
  const {
    navigate,
    decks,
    setDecks,
    setActiveDeck,
    studyOptions,
    setStudyOptions,
    showInfo,
    showWarning,
    showCreateForm,
    setShowCreateForm,
    newDeckName,
    setNewDeckName,
    editingDeck,
    setEditingDeck,
    showOptions,
    setShowOptions,
    createDeck,
    deleteDeck,
    getDeckStats,
    updateDeck,
    handleDeckSelect
  } = useDecksPage()

  // Custom styles for DecksPage
  const customStyles = {
    container: 'min-h-screen p-4 pb-20 md:pb-4',
    header: 'grid grid-cols-1 md:grid-cols-3 items-center mb-6 gap-3',
    headerActions: 'flex items-center gap-3 justify-end',
    createForm: 'mb-6 p-4 bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg',
    formActions: 'flex gap-3 mt-4',
    decksGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    deckCard: 'relative p-6 bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200',
    emptyState: 'flex flex-col items-center justify-center min-h-[40vh] sm:min-h-[50vh] p-8 text-center w-full',
    optionsBtn: 'p-2 bg-white/90 border border-white/10 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center w-11 h-11',
    btnPrimary: 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 flex items-center gap-3 min-w-[140px] justify-center shadow-md',
    btnSecondary: 'bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2',
    // ensure the close button is a centered square so the icon is visually centered
    closeButton: 'absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center justify-center w-9 h-9',
    optionGroup: 'mb-5 sm:mb-6',
    radioGroup: 'flex flex-col gap-2 ml-4',
    optionActions: 'flex gap-3 mt-6',
    presetButton: 'px-3 py-2 text-sm rounded-lg transition-all duration-200 min-w-[44px] touch-manipulation',
    presetButtonActive: 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm',
    presetButtonInactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent',
    deckHeader: 'flex items-center justify-between mb-4',
    deckName: 'text-xl font-semibold text-gray-900 truncate',
    deleteBtn: 'absolute top-3 right-3 p-0 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-md transition-colors duration-150 opacity-90 hover:opacity-100 shadow-sm flex items-center justify-center w-9 h-9',
    deckStats: 'mb-4 space-y-2',
    statRow: 'flex justify-between text-sm text-gray-600',
    progressContainer: 'mb-4',
    progressBar: 'w-full bg-gray-200 rounded-full h-2 mb-2',
    progressFill: 'bg-blue-500 h-2 rounded-full transition-all duration-300',
    progressText: 'text-sm text-gray-600',
    deckActions: 'flex gap-3 justify-center mt-4',
    emptyIcon: 'text-6xl text-gray-400 mb-4'
  }

  const baseStyles = useStyle()
  const styles = { ...baseStyles, decks: { ...baseStyles.decks, ...customStyles } }

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
    <div className={styles.decks.container}>
      {/* Study Options Modal */}
      {showOptions && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50" onClick={() => setShowOptions(false)}>
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.decks.closeButton}
                onClick={() => setShowOptions(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-6 pr-8">Study Options</h3>

              <div className={styles.decks.optionGroup}>
                <label className="flex items-center gap-3 text-gray-700">
                  <input
                    type="checkbox"
                    checked={studyOptions.randomOrder}
                    onChange={(e) => setStudyOptions(prev => ({ ...prev, randomOrder: e.target.checked }))}
                    className="form-check"
                  />
                  <FaRandom /> Shuffle Cards
                </label>
              </div>

              <div className={styles.decks.optionGroup}>
                <label className="block text-gray-700 font-medium mb-2">Card Direction:</label>
                <div className={styles.decks.radioGroup}>
                  <label className="flex items-center gap-3 text-gray-700">
                    <input
                      type="radio"
                      value="front-to-back"
                      checked={studyOptions.direction === 'front-to-back'}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, direction: e.target.value }))}
                      className="form-radio"
                    />
                    Front → Back
                  </label>
                  <label className="flex items-center gap-3 text-gray-700">
                    <input
                      type="radio"
                      value="back-to-front"
                      checked={studyOptions.direction === 'back-to-front'}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, direction: e.target.value }))}
                      className="form-radio"
                    />
                    Back → Front
                  </label>
                  <label className="flex items-center gap-3 text-gray-700">
                    <input
                      type="radio"
                      value="random"
                      checked={studyOptions.direction === 'random'}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, direction: e.target.value }))}
                      className="form-radio"
                    />
                    <FaRandom /> Mixed Direction
                  </label>
                </div>
              </div>

              <div className={styles.decks.optionGroup}>
                <label className="flex items-center gap-3 text-gray-700">
                  <input
                    type="checkbox"
                    checked={studyOptions.onlyMissed}
                    onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyMissed: e.target.checked }))}
                    className="form-check"
                  />
                  <FaExclamationTriangle /> Focus on Missed Cards
                </label>
              </div>

              <div className={styles.decks.optionGroup}>
                <label className="flex items-center gap-3 text-gray-700">
                  <input
                    type="checkbox"
                    checked={studyOptions.showBothSides}
                    onChange={(e) => setStudyOptions(prev => ({ ...prev, showBothSides: e.target.checked }))}
                    className="form-check"
                  />
                  Show Both Sides When Flipped
                </label>
              </div>

              <div className={styles.decks.optionGroup}>
                <label className="flex items-center gap-3 text-gray-700">
                  <input
                    type="checkbox"
                    checked={studyOptions.autoRead}
                    onChange={(e) => setStudyOptions(prev => ({ ...prev, autoRead: e.target.checked }))}
                    className="form-check"
                  />
                  Auto-Read Card Contents
                </label>
              </div>

              <div className={styles.decks.optionGroup}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 font-medium">Card Limit</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={studyOptions.cardLimit !== null}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStudyOptions(prev => ({ ...prev, cardLimit: 10 }))
                          } else {
                            setStudyOptions(prev => ({ ...prev, cardLimit: null }))
                          }
                        }}
                        className="form-check"
                      />
                      <span className="text-sm text-gray-600">
                        {studyOptions.cardLimit !== null ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                  
                  {studyOptions.cardLimit !== null && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Cards per session:</span>
                        <span className="font-medium text-blue-600 min-w-[4rem] text-right">
                          {studyOptions.cardLimit}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={studyOptions.cardLimit || 10}
                          onChange={(e) => setStudyOptions(prev => ({ ...prev, cardLimit: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((studyOptions.cardLimit || 10) / 100) * 100}%, #e5e7eb ${((studyOptions.cardLimit || 10) / 100) * 100}%, #e5e7eb 100%)`
                          }}
                        />
                        <div className="flex justify-between text-xs text-gray-400 px-1">
                          <span>1</span>
                          <span>25</span>
                          <span>50</span>
                          <span>75</span>
                          <span>100</span>
                        </div>
                      </div>

                      {/* Quick preset buttons for common values */}
                      <div className="flex gap-2 pt-1">
                        {[5, 10, 20, 50, 75, 100].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setStudyOptions(prev => ({ ...prev, cardLimit: preset }))}
                            className={`${styles.decks.presetButton} ${
                              studyOptions.cardLimit === preset 
                                ? styles.decks.presetButtonActive
                                : styles.decks.presetButtonInactive
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <div className={styles.decks.header}>
        <div className="md:col-span-3">
          <h1 className="text-3xl font-bold text-gray-900">My Decks</h1>
          <p className="text-gray-600 mt-2">Organize your decks — create, edit, and start studying.</p>
        </div>

        <div className="md:col-span-3 flex items-center justify-center gap-4">
          <button
            className={styles.decks.btnPrimary}
            onClick={() => setShowCreateForm(true)}
          >
            <FaPlus /> New Deck
          </button>

          <button
            className={styles.decks.optionsBtn}
            onClick={() => setShowOptions(true)}
            title="Study Options"
            style={{
              position: 'relative'
            }}
          >
            <FaCog />
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className={styles.decks.createForm}>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Deck</h3>
          <input
            type="text"
            placeholder="Deck name..."
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createDeck()}
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className={styles.decks.formActions}>
            <button className={styles.decks.btnSecondary} onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
            <button className={styles.decks.btnPrimary} onClick={createDeck}>
              Create
            </button>
          </div>
        </div>
      )}

      <div className={styles.decks.decksGrid}>
        {decks.map(deck => {
          const stats = getDeckStats(deck)
          const progress = stats.total > 0 ? (stats.reviewed / stats.total) * 100 : 0

          return (
            <div key={deck.id} className={styles.decks.deckCard}>
              <div className={styles.decks.deckHeader}>
                <h3 className={styles.decks.deckName}>{deck.name}</h3>
                <button
                  className={styles.decks.deleteBtn}
                  onClick={() => deleteDeck(deck.id)}
                >
                  <FaTrash />
                </button>
              </div>

              <div className={styles.decks.deckStats}>
                <div className={styles.decks.statRow}>
                  <span>Total Cards:</span>
                  <span>{stats.total}</span>
                </div>
                <div className={styles.decks.statRow}>
                  <span>Reviewed:</span>
                  <span>{stats.reviewed}</span>
                </div>
                <div className={styles.decks.statRow}>
                  <span>Mastered:</span>
                  <span>{stats.mastered}</span>
                </div>
                {(studyOptions.cardLimit || studyOptions.onlyMissed) && (
                  <div className={styles.decks.statRow} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                    <span className="font-medium text-blue-600">Study Session:</span>
                    <span className="font-medium text-blue-600">{stats.studyCount} cards</span>
                  </div>
                )}
              </div>

              <div className={styles.decks.progressContainer}>
                <div className={styles.decks.progressBar}>
                  <div
                    className={styles.decks.progressFill}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className={styles.decks.progressText}>{Math.round(progress)}% complete</span>
              </div>

              <div className={styles.decks.deckActions}>
                <button
                  className={styles.decks.btnSecondary}
                  onClick={() => setEditingDeck(deck)}
                >
                  <FaEdit /> Edit
                </button>
                <button
                  className={styles.decks.btnPrimary}
                  onClick={() => handleDeckSelect(deck)}
                  disabled={stats.total === 0}
                >
                  <FaBook />
                  {stats.total === 0 ? 'No Cards' : 'Study'}
                </button>
                {/* delete button is in the top-right of the card header */}
              </div>
            </div>
          )
        })}
      </div>

      {decks.length === 0 && (
        <div className={styles.decks.emptyState}>
          <div className={styles.decks.emptyIcon}><FaBook /></div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Decks Yet</h2>
          <p className="text-gray-500">Create your first deck to start studying!</p>
        </div>
      )}
    </div>
  )
}


