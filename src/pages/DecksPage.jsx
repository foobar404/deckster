import { useStyle } from '../utils'
import { useNavigate } from 'react-router-dom'
import { useState, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Portal } from '../components/Portal'
import { CardEditor } from '../components/CardEditor'
import { FaPlus, FaTrash, FaEdit, FaBook, FaCog, FaRandom, FaExclamationTriangle, FaTimes, FaFilter, FaChevronDown, FaChevronUp } from 'react-icons/fa'

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
  const [selectedTag, setSelectedTag] = useState('all')
  const [showTagFilter, setShowTagFilter] = useState(false)

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
    if (deckToDelete && window.confirm(`Delete "${deckToDelete.name}" and all its cards? This cannot be undone.`)) {
      setDecks(prev => prev.filter(deck => deck.id !== deckId))
      showWarning(`Deleted deck "${deckToDelete.name}"`)
    }
  }

  const getCardStrength = (card) => {
    if (typeof card?.memoryStrength === 'number') return Math.max(0, Math.min(100, card.memoryStrength))
    if (typeof card?.difficulty === 'number') return Math.max(0, Math.min(100, card.difficulty))
    return 0
  }

  const getDeckStats = (deck) => {
    const total = deck.cards.length
    const reviewed = deck.cards.filter(card => card.lastReviewed || card.lastReviewedAt).length
    const mastered = deck.cards.filter(card => getCardStrength(card) >= 80 || card.state === 'mastered').length

    // Calculate study cards based on current options
    let studyCount = total
    if (studyOptions.onlyMissed) {
      const missedCards = deck.cards.filter(card => getCardStrength(card) < 60 && card.state !== 'mastered')
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
    selectedTag,
    setSelectedTag,
    showTagFilter,
    setShowTagFilter,
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
  const [collapsedDeckIds, setCollapsedDeckIds] = useState(() => new Set())
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
    selectedTag,
    setSelectedTag,
    showTagFilter,
    setShowTagFilter,
    showOptions,
    setShowOptions,
    createDeck,
    deleteDeck,
    getDeckStats,
    updateDeck,
    handleDeckSelect
  } = useDecksPage()

  const availableTags = [...new Set(decks.flatMap(deck => deck.tags || []))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  const visibleDecks = decks
    .filter(deck => selectedTag === 'all' || (deck.tags || []).includes(selectedTag))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

  // Custom styles for DecksPage
  const customStyles = {
    container: 'min-h-screen p-4 pb-20 md:pb-4 md:max-w-6xl md:mx-auto',
    header: 'grid grid-cols-1 md:grid-cols-3 items-center mb-6 gap-3',
    headerActions: 'flex items-center gap-3 justify-end',
    createForm: 'mb-6 p-4 bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg',
    formActions: 'flex gap-3 mt-4',
    decksGrid: 'grid grid-cols-1 items-start md:grid-cols-2 lg:grid-cols-3 gap-4',
    deckCard: 'relative self-start p-6 bg-white/90 backdrop-blur-lg border-8 border-solid rounded-xl shadow-lg hover:shadow-xl transition-all duration-200',
    emptyState: 'flex flex-col items-center justify-center min-h-[40vh] sm:min-h-[50vh] p-8 text-center w-full',
    optionsBtn: 'p-2 bg-white/90 border border-white/10 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center w-11 h-11',
    btnPrimary: 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 flex items-center gap-3 min-w-[140px] justify-center shadow-md',
    btnCram: 'bg-amber-400 hover:bg-amber-500 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 flex items-center gap-3 min-w-[140px] justify-center shadow-md',
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
    deleteBtn: 'p-0 bg-white/60 text-gray-500 hover:bg-white hover:text-red-600 rounded-md transition-colors duration-150 flex items-center justify-center w-9 h-9',
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
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto relative flex flex-col" onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.decks.closeButton}
                onClick={() => setShowOptions(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-6 pr-8">Study Options</h3>

              <div className={`${styles.decks.optionGroup} order-1`}>
                <label className="block text-gray-700 font-medium mb-3">Study mode</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'review', label: 'Review' },
                    { value: 'cram', label: 'Cram' }
                  ].map(mode => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setStudyOptions(prev => ({ ...prev, mode: mode.value }))}
                      className={`${styles.decks.presetButton} ${
                        studyOptions.mode === mode.value
                          ? styles.decks.presetButtonActive
                          : styles.decks.presetButtonInactive
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${styles.decks.optionGroup} order-4`}>
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

              <div className={`${styles.decks.optionGroup} order-3`}>
                <label className="block text-gray-700 font-medium mb-3">Filter by status</label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={studyOptions.onlyNew}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyNew: e.target.checked }))}
                      className="form-check"
                    />
                    New
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={studyOptions.onlyMissed}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyMissed: e.target.checked }))}
                      className="form-check"
                    />
                    Weak
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={studyOptions.onlyLearning}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyLearning: e.target.checked }))}
                      className="form-check"
                    />
                    Learning
                  </label>

                  <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={studyOptions.onlyMastered}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyMastered: e.target.checked }))}
                      className="form-check"
                    />
                    Mastered
                  </label>
                </div>
              </div>

              <div className={`${styles.decks.optionGroup} order-4`}>
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

              {studyOptions.mode !== 'cram' && <div className={`${styles.decks.optionGroup} order-2`}>
                <div className="space-y-3">
                  <label className="block text-gray-700 font-medium">Cards per session</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[10, 25, 50, 100].map(preset => (
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
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={studyOptions.cardLimit ?? ''}
                      onChange={(e) => {
                        const value = e.target.value
                        const limit = value === '' ? null : Math.min(100, Math.max(1, Number(value)))
                        setStudyOptions(prev => ({ ...prev, cardLimit: limit }))
                      }}
                      placeholder="Custom"
                      aria-label="Custom cards per session"
                      className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setStudyOptions(prev => ({ ...prev, cardLimit: null }))}
                      className={`${styles.decks.presetButton} ${
                        studyOptions.cardLimit === null
                          ? styles.decks.presetButtonActive
                          : styles.decks.presetButtonInactive
                      }`}
                    >
                      No limit
                    </button>
                  </div>
                </div>
              </div>}
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

      <div className="relative mb-4">
        <button
          type="button"
          onClick={() => setShowTagFilter(open => !open)}
          aria-expanded={showTagFilter}
          aria-haspopup="true"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <FaFilter />
          {selectedTag === 'all' ? 'Filter by tag' : selectedTag}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{selectedTag === 'all' ? availableTags.length : 1}</span>
        </button>
        {showTagFilter && (
          <div className="absolute left-0 top-full z-30 mt-2 min-w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
            <button
              type="button"
              onClick={() => { setSelectedTag('all'); setShowTagFilter(false) }}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${selectedTag === 'all' ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              All decks
            </button>
            {availableTags.length > 0 ? availableTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => { setSelectedTag(tag); setShowTagFilter(false) }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm ${selectedTag === tag ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {tag}
              </button>
            )) : (
              <p className="px-3 py-2 text-sm text-gray-500">No tags defined yet. Add tags in a deck’s Edit page.</p>
            )}
          </div>
        )}
        {selectedTag !== 'all' && (
          <span className="ml-3 text-sm text-gray-500">Showing decks tagged “{selectedTag}”</span>
        )}
      </div>

      <div className={styles.decks.decksGrid}>
        {visibleDecks.map(deck => {
          const stats = getDeckStats(deck)
          const progress = stats.total > 0 ? (stats.reviewed / stats.total) * 100 : 0
          const isCollapsed = collapsedDeckIds.has(deck.id)
          const deckColor = deck.appearance?.color || '#ffffff'
          const deckTextColor = '#111827'

          return (
            <div key={deck.id} className={`${styles.decks.deckCard} ${isCollapsed ? 'p-3' : ''}`} style={{ borderColor: deckColor, color: deckTextColor }}>
              <div className={`${styles.decks.deckHeader} ${isCollapsed ? 'mb-0' : ''}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/75 text-3xl shadow-sm" aria-hidden="true">{deck.appearance?.icon || '📚'}</span>
                  <h3 className={styles.decks.deckName} style={{ color: deckTextColor }}>{deck.name}</h3>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/70 hover:text-blue-600"
                    onClick={() => setCollapsedDeckIds(prev => {
                      const next = new Set(prev)
                      if (next.has(deck.id)) next.delete(deck.id)
                      else next.add(deck.id)
                      return next
                    })}
                    aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${deck.name}`}
                    aria-expanded={!isCollapsed}
                    title={isCollapsed ? 'Expand deck' : 'Collapse deck'}
                  >
                    {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
                  </button>
                  <button
                    className={styles.decks.deleteBtn}
                    onClick={() => deleteDeck(deck.id)}
                    aria-label={`Delete ${deck.name}`}
                    title="Delete deck"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {!isCollapsed && <>
              {(deck.tags || []).length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {deck.tags.map(tag => <span key={tag} className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-gray-600">{tag}</span>)}
                </div>
              )}

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
                    <span className="font-medium" style={{ color: deckTextColor }}>Study Session:</span>
                    <span className="font-medium" style={{ color: deckTextColor }}>{stats.studyCount} cards</span>
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
                <span className={styles.decks.progressText} style={{ color: deckTextColor }}>{Math.round(progress)}% complete</span>
              </div>

              <div className={styles.decks.deckActions}>
                <button
                  className={styles.decks.btnSecondary}
                  onClick={() => setEditingDeck(deck)}
                >
                  <FaEdit /> Edit
                </button>
                <button
                  className={studyOptions.mode === 'cram' ? styles.decks.btnCram : styles.decks.btnPrimary}
                  onClick={() => handleDeckSelect(deck)}
                  disabled={stats.total === 0}
                >
                  <FaBook />
                  {stats.total === 0 ? 'No Cards' : studyOptions.mode === 'cram' ? 'Cram' : 'Study'}
                </button>
                {/* delete button is in the top-right of the card header */}
              </div>
              </>}
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
      {decks.length > 0 && visibleDecks.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">No decks match this tag.</p>
      )}
    </div>
  )
}


