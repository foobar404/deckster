import '../css/decks.css'
import { matchesStudyStatusFilters } from '../utils'
import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useLayoutEffect, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { Portal } from '../components/Portal'
import { CardEditor } from '../components/CardEditor'
import { AiCardGeneratorModal } from '../components/AiCardGeneratorModal'
import { DeckStatusSummary } from '../components/DeckStatusSummary'
import { FaPlus, FaEdit, FaBook, FaCog, FaMagic, FaRandom, FaExclamationTriangle, FaTimes, FaFilter, FaSort, FaChevronDown, FaChevronUp } from 'react-icons/fa'

const deckSortOptions = [
  { value: 'name-asc', label: 'A-Z', description: 'Name, A to Z' },
  { value: 'name-desc', label: 'Z-A', description: 'Name, Z to A' },
  { value: 'newest', label: 'New', description: 'Newest first' },
  { value: 'oldest', label: 'Old', description: 'Oldest first' }
]

const getDeckCreationTime = deck => {
  const time = deck.createdAt ? new Date(deck.createdAt).getTime() : Number(deck.id)
  return Number.isFinite(time) ? time : 0
}

const formatDeckCreationDate = deck => {
  const timestamp = getDeckCreationTime(deck)
  return timestamp ? new Date(timestamp).toLocaleDateString() : 'Unknown'
}

const formatStudyTime = value => {
  const seconds = Math.max(0, Math.floor(Number(value) || 0))
  if (seconds < 60) return `${seconds}s`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${Math.floor(seconds / 60)}m`
}

/**
 * Custom hook for DecksPage logic and state management
 * @returns {Object} All state and handlers needed by the DecksPage component
 */
const useDecksPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { decks, setDecks, setActiveDeck, studyOptions: defaultStudyOptions, updateDeckStudyOptions } = useContext(AppContext)
  const { showInfo, showWarning } = useToast()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [editingDeck, setEditingDeck] = useState(null)
  const [showOptions, setShowOptions] = useState(false)
  const [optionsDeckId, setOptionsDeckId] = useState(null)
  const [selectedTag, setSelectedTag] = useState(() => {
    try {
      return localStorage.getItem('flashcards_selected_deck_tag') || 'all'
    } catch {
      return 'all'
    }
  })
  const [showTagFilter, setShowTagFilter] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('flashcards_selected_deck_tag', selectedTag)
    } catch {
    }
  }, [selectedTag])

  useLayoutEffect(() => {
    if (!location.state?.navRoot) return
    setEditingDeck(null)
    setShowCreateForm(false)
    setShowOptions(false)
    setOptionsDeckId(null)
    setShowTagFilter(false)
  }, [location.key, location.state])

  const optionsDeck = decks.find(deck => String(deck.id) === String(optionsDeckId))
  const studyOptions = optionsDeck?.studyOptions || defaultStudyOptions
  const setStudyOptions = update => {
    updateDeckStudyOptions(optionsDeckId, update)
  }

  const openStudyOptions = deck => {
    setOptionsDeckId(deck.id)
    setShowOptions(true)
  }

  const createDeck = () => {
    if (!newDeckName.trim()) return

    const newDeck = {
      id: Date.now(),
      name: newDeckName.trim(),
      cards: [],
      createdAt: new Date().toISOString(),
      totalStudyTimeSeconds: 0
    }

    setDecks(prev => [...prev, newDeck])
    setNewDeckName('')
    setShowCreateForm(false)
    showInfo(`Created new deck "${newDeck.name}"`)
  }

  const createAiDeck = generatedDeck => {
    const newDeck = {
      id: Date.now() + 9999,
      ...generatedDeck,
      createdAt: new Date().toISOString(),
      totalStudyTimeSeconds: 0
    }
    setDecks(previousDecks => [...previousDecks, newDeck])
  }

  const deleteDeck = (deckId) => {
    const deckToDelete = decks.find(deck => deck.id === deckId)
    if (!deckToDelete || !window.confirm(`Delete "${deckToDelete.name}" and all its cards? This cannot be undone.`)) return false

    setDecks(prev => prev.filter(deck => deck.id !== deckId))
    showWarning(`Deleted deck "${deckToDelete.name}"`)
    return true
  }

  const getDeckStats = (deck) => {
    const deckStudyOptions = deck.studyOptions || defaultStudyOptions
    const total = deck.cards.length
    let studyCards = deck.cards.filter(card => matchesStudyStatusFilters(card, deckStudyOptions))

    if (deckStudyOptions.mode !== 'cram' && deckStudyOptions.recentlyWrong) {
      studyCards = studyCards.filter(card => (card.lapseCount || 0) > 0 || (card.lastResult ?? 3) < 2)
    }

    let studyCount = studyCards.length

    // Apply card limit if set
    if (deckStudyOptions.cardLimit && deckStudyOptions.cardLimit > 0) {
      studyCount = Math.min(studyCount, deckStudyOptions.cardLimit)
    }

    return { total, studyCount }
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
    navigate('/study')
  }

  return {
    navigate,
    decks,
    setDecks,
    setActiveDeck,
    studyOptions,
    setStudyOptions,
    defaultStudyOptions,
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
    optionsDeckId,
    openStudyOptions,
    createDeck,
    createAiDeck,
    deleteDeck,
    getDeckStats,
    updateDeck,
    handleDeckSelect
  }
}

export function DecksPage() {
  const [showAiDeckGenerator, setShowAiDeckGenerator] = useState(false)
  const [collapsedDeckIds, setCollapsedDeckIds] = useState(() => {
    try {
      const savedIds = JSON.parse(localStorage.getItem('flashcards_collapsed_deck_ids') || '[]')
      return new Set(Array.isArray(savedIds) ? savedIds : [])
    } catch {
      return new Set()
    }
  })
  const [sortMode, setSortMode] = useState(() => {
    try {
      const savedSortMode = localStorage.getItem('flashcards_deck_sort_mode')
      return deckSortOptions.some(option => option.value === savedSortMode) ? savedSortMode : 'name-asc'
    } catch {
      return 'name-asc'
    }
  })
  const {
    navigate,
    decks,
    setDecks,
    setActiveDeck,
    studyOptions,
    setStudyOptions,
    defaultStudyOptions,
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
    optionsDeckId,
    openStudyOptions,
    createDeck,
    createAiDeck,
    deleteDeck,
    getDeckStats,
    updateDeck,
    handleDeckSelect
  } = useDecksPage()

  useEffect(() => {
    try {
      localStorage.setItem('flashcards_collapsed_deck_ids', JSON.stringify([...collapsedDeckIds]))
    } catch {
    }
  }, [collapsedDeckIds])

  useEffect(() => {
    try {
      localStorage.setItem('flashcards_deck_sort_mode', sortMode)
    } catch {
    }
  }, [sortMode])

  const availableTags = [...new Set(decks.flatMap(deck => deck.tags || []))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  const visibleDecks = decks
    .filter(deck => selectedTag === 'all' || (deck.tags || []).includes(selectedTag))
    .slice()
    .sort((a, b) => {
      if (sortMode === 'name-asc' || sortMode === 'name-desc') {
        const direction = sortMode === 'name-asc' ? 1 : -1
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * direction
      }

      const direction = sortMode === 'newest' ? 1 : -1
      return (getDeckCreationTime(b) - getDeckCreationTime(a)) * direction
    })
  const allVisibleDecksCollapsed = visibleDecks.length > 0 &&
    visibleDecks.every(deck => collapsedDeckIds.has(deck.id))
  const hasCollapsedVisibleDecks = visibleDecks.some(deck => collapsedDeckIds.has(deck.id))
  const currentSortOption = deckSortOptions.find(option => option.value === sortMode)
  const optionsDeck = decks.find(deck => String(deck.id) === String(optionsDeckId))

  const customStyles = {
    container: 'decks-page',
    header: 'decks-page__header',
    createForm: 'decks-page__create-form surface-panel',
    formActions: 'decks-page__form-actions',
    decksGrid: 'decks-grid',
    deckCard: 'deck-card surface-panel',
    emptyState: 'decks-page__empty',
    optionsBtn: 'button button--icon button--quiet decks-page__options-button',
    btnPrimary: 'button button--primary decks-page__action-button',
    btnCram: 'button button--cram decks-page__action-button',
    btnSecondary: 'button button--secondary',
    closeButton: 'button button--icon button--quiet modal-dialog__close',
    optionGroup: 'study-option-group',
    radioGroup: 'study-option-radio-list',
    presetButton: 'study-option-preset',
    presetButtonActive: 'is-selected',
    deckHeader: 'deck-card__header',
    deckName: 'deck-card__name',
    deckStats: 'deck-card__stats',
    statRow: 'deck-card__stat',
    deckActions: 'deck-card__actions',
    emptyIcon: 'decks-page__empty-icon'
  }

  const styles = { decks: customStyles }

  if (editingDeck) {
    return (
      <CardEditor
        deck={editingDeck}
        onDraftSave={updateDeck}
          onDelete={() => {
            if (deleteDeck(editingDeck.id)) setEditingDeck(null)
          }}
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
      {showAiDeckGenerator && (
        <AiCardGeneratorModal
          onClose={() => setShowAiDeckGenerator(false)}
          onCreateDeck={generatedDeck => {
            createAiDeck(generatedDeck)
            setShowAiDeckGenerator(false)
          }}
        />
      )}

      {/* Study Options Modal */}
      {showOptions && (
        <Portal>
          <div className="modal-backdrop decks-options-backdrop" onClick={() => setShowOptions(false)}>
            <div className="modal-dialog decks-options-dialog" onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.decks.closeButton}
                onClick={() => setShowOptions(false)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
              <h3 className="modal-dialog__title">
                Study Options{optionsDeck ? ` · ${optionsDeck.name}` : ''}
              </h3>

              <div className={`${styles.decks.optionGroup} study-option-group--mode`}>
                <label className="form-label">Study mode</label>
                <div className="study-option-preset-row">
                  {[
                    { value: 'review', label: 'Study' },
                    { value: 'cram', label: 'Cram' }
                  ].map(mode => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setStudyOptions(prev => ({ ...prev, mode: mode.value }))}
                      className={`${styles.decks.presetButton}${studyOptions.mode === mode.value ? ` ${styles.decks.presetButtonActive}` : ''}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${styles.decks.optionGroup} study-option-group--behavior`}>
                {studyOptions.mode !== 'cram' && (
                  <div className="study-option-subgroup">
                    <label className="form-label">Card order:</label>
                    <div className={styles.decks.radioGroup}>
                      {[
                        { value: 'forward', label: 'Forward' },
                        { value: 'reverse', label: 'Reverse' },
                        { value: 'random', label: 'Random' }
                      ].map(order => (
                        <label key={order.value} className="study-option-radio">
                          <input
                            type="radio"
                            name="card-order"
                            value={order.value}
                            checked={studyOptions.cardOrder === order.value}
                            onChange={(e) => setStudyOptions(prev => ({ ...prev, cardOrder: e.target.value }))}
                            className="study-option-control"
                          />
                          {order.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <label className="form-label">Card direction:</label>
                <div className={styles.decks.radioGroup}>
                  <label className="study-option-radio">
                    <input
                      type="radio"
                      value="front-to-back"
                      checked={studyOptions.direction === 'front-to-back'}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, direction: e.target.value }))}
                      className="study-option-control"
                    />
                    Front → Back
                  </label>
                  <label className="study-option-radio">
                    <input
                      type="radio"
                      value="back-to-front"
                      checked={studyOptions.direction === 'back-to-front'}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, direction: e.target.value }))}
                      className="study-option-control"
                    />
                    Back → Front
                  </label>
                  <label className="study-option-radio">
                    <input
                      type="radio"
                      value="random"
                      checked={studyOptions.direction === 'random'}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, direction: e.target.value }))}
                      className="study-option-control"
                    />
                    <FaRandom /> Mixed Direction
                  </label>
                </div>
              </div>

              <div className={`${styles.decks.optionGroup} study-option-group--filters`}>
                <label className="form-label">Filter by status</label>
                <div className="study-option-checks">
                  <label className="study-option-check">
                    <input
                      type="checkbox"
                      checked={studyOptions.onlyNew}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyNew: e.target.checked }))}
                      className="study-option-control"
                    />
                    New
                  </label>

                  <label className="study-option-check">
                    <input
                      type="checkbox"
                      checked={studyOptions.onlyMissed}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyMissed: e.target.checked }))}
                      className="study-option-control"
                    />
                    Weak
                  </label>

                  <label className="study-option-check">
                    <input
                      type="checkbox"
                      checked={studyOptions.onlyLearning}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyLearning: e.target.checked }))}
                      className="study-option-control"
                    />
                    Learning
                  </label>

                  <label className="study-option-check">
                    <input
                      type="checkbox"
                      checked={studyOptions.onlyMastered}
                      onChange={(e) => setStudyOptions(prev => ({ ...prev, onlyMastered: e.target.checked }))}
                      className="study-option-control"
                    />
                    Mastered
                  </label>
                </div>
              </div>

              <div className={`${styles.decks.optionGroup} study-option-group--behavior`}>
                <label className="study-option-radio">
                  <input
                    type="checkbox"
                    checked={studyOptions.showBothSides}
                    onChange={(e) => setStudyOptions(prev => ({ ...prev, showBothSides: e.target.checked }))}
                    className="study-option-control"
                  />
                  Show Both Sides When Flipped
                </label>
              </div>

              <div className={`${styles.decks.optionGroup} study-option-group--behavior`}>
                <label className="study-option-radio">
                  <input
                    type="checkbox"
                    checked={Boolean(studyOptions.typeToAnswer)}
                    onChange={(e) => setStudyOptions(prev => ({ ...prev, typeToAnswer: e.target.checked }))}
                    className="study-option-control"
                  />
                  Type answer before revealing
                </label>
              </div>

              {studyOptions.mode !== 'cram' && <div className={`${styles.decks.optionGroup} study-option-group--limit`}>
                <div className="study-option-limit">
                  <label className="form-label">Cards per session</label>
                  <div className="study-option-preset-row">
                    {[10, 25, 50, 100].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStudyOptions(prev => ({ ...prev, cardLimit: preset }))}
                        className={`${styles.decks.presetButton}${studyOptions.cardLimit === preset ? ` ${styles.decks.presetButtonActive}` : ''}`}
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
                      className="field field--compact study-option-custom-limit"
                    />
                    <button
                      type="button"
                      onClick={() => setStudyOptions(prev => ({ ...prev, cardLimit: null }))}
                      className={`${styles.decks.presetButton}${studyOptions.cardLimit === null ? ` ${styles.decks.presetButtonActive}` : ''}`}
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
        <div className="decks-page__intro">
          <div className="decks-page__title-row">
            <h1 className="decks-page__title">My Decks</h1>
            <span
              className="decks-page__count"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-primary-contrast)'
              }}
            >
              {decks.length}
            </span>
          </div>
          <p className="decks-page__description">Organize your decks — each deck has its own study options.</p>
        </div>

        <div className="decks-page__header-actions">
          <button
            type="button"
            className="button button--outline decks-page__action-button"
            onClick={() => setShowAiDeckGenerator(true)}
            aria-label="Create AI Deck"
            title="Create AI Deck"
          >
            <FaMagic aria-hidden="true" />
            <span className="decks-page__action-label">Create AI Deck</span>
          </button>
          <button
            type="button"
            className={styles.decks.btnPrimary}
            onClick={() => setShowCreateForm(true)}
            aria-label="New Deck"
            title="New Deck"
          >
            <FaPlus aria-hidden="true" />
            <span className="decks-page__action-label">New Deck</span>
          </button>

        </div>
      </div>

      {showCreateForm && (
        <div className={styles.decks.createForm}>
          <h3 className="decks-page__section-title">Create New Deck</h3>
          <input
            type="text"
            placeholder="Deck name..."
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createDeck()}
            className="field"
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

      <div className="decks-page__toolbar">
        <button
          type="button"
          onClick={() => {
            const currentIndex = deckSortOptions.findIndex(option => option.value === sortMode)
            setSortMode(deckSortOptions[(currentIndex + 1) % deckSortOptions.length].value)
          }}
          aria-label={`Sort decks: ${currentSortOption.description}. Click to change sort order.`}
          title={`Sort: ${currentSortOption.description}`}
          className="button button--outline deck-toolbar-button deck-toolbar-button--sort"
        >
          <FaSort aria-hidden="true" />
          <span className="deck-toolbar-button__label">{currentSortOption.label}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowTagFilter(open => !open)}
          aria-expanded={showTagFilter}
          aria-haspopup="true"
          aria-label={`Filter by tag${selectedTag === 'all' ? '' : `: ${selectedTag}`}`}
          title={`Filter by tag${selectedTag === 'all' ? '' : `: ${selectedTag}`}`}
          className={`button button--outline deck-toolbar-button${selectedTag === 'all' ? '' : ' is-filtered'}`}
        >
          <FaFilter aria-hidden="true" />
          <span className="deck-toolbar-button__label">
            {selectedTag === 'all' ? 'Filter by tag' : selectedTag}
          </span>
        </button>
        <div className="decks-page__collapse-actions">
          <button
            type="button"
            className="button button--outline deck-toolbar-button"
            onClick={() => setCollapsedDeckIds(previousIds => new Set([
              ...previousIds,
              ...visibleDecks.map(deck => deck.id)
            ]))}
            disabled={visibleDecks.length === 0 || allVisibleDecksCollapsed}
            aria-label="Fold all visible decks"
            title="Fold all visible decks"
          >
            <FaChevronUp aria-hidden="true" />
            <span className="deck-toolbar-button__label">Fold all</span>
          </button>
          <button
            type="button"
            className="button button--outline deck-toolbar-button"
            onClick={() => {
              const visibleDeckIds = new Set(visibleDecks.map(deck => deck.id))
              setCollapsedDeckIds(previousIds => new Set(
                [...previousIds].filter(deckId => !visibleDeckIds.has(deckId))
              ))
            }}
            disabled={!hasCollapsedVisibleDecks}
            aria-label="Unfold all visible decks"
            title="Unfold all visible decks"
          >
            <FaChevronDown aria-hidden="true" />
            <span className="deck-toolbar-button__label">Unfold all</span>
          </button>
        </div>
        {showTagFilter && (
          <div className="deck-filter-menu">
            <button
              type="button"
              onClick={() => { setSelectedTag('all'); setShowTagFilter(false) }}
              className={`deck-filter-menu__option${selectedTag === 'all' ? ' is-selected' : ''}`}
            >
              All decks
            </button>
            {availableTags.length > 0 ? availableTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => { setSelectedTag(tag); setShowTagFilter(false) }}
                className={`deck-filter-menu__option${selectedTag === tag ? ' is-selected' : ''}`}
              >
                {tag}
              </button>
            )) : (
              <p className="deck-filter-menu__empty">No tags defined yet. Add tags in a deck’s Edit page.</p>
            )}
          </div>
        )}
        {selectedTag !== 'all' && (
          <span className="decks-page__filter-summary">Showing decks tagged “{selectedTag}”</span>
        )}
      </div>

      <div className={styles.decks.decksGrid}>
        {visibleDecks.map(deck => {
          const stats = getDeckStats(deck)
          const deckStudyOptions = deck.studyOptions || defaultStudyOptions
          const isCollapsed = collapsedDeckIds.has(deck.id)
          const deckColor = deck.appearance?.color || '#ffffff'
          const deckTextColor = 'var(--theme-text)'

          return (
            <div key={deck.id} className={`${styles.decks.deckCard}${isCollapsed ? ' is-collapsed' : ' is-expanded'}`} style={{ borderColor: deckColor, color: deckTextColor }}>
              <div className={`${styles.decks.deckHeader}${isCollapsed ? ' is-collapsed' : ''}`}>
                <div className="deck-card__identity">
                  <button
                    type="button"
                    className="button button--icon button--quiet deck-card__collapse"
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
                  <span className="deck-card__icon" aria-hidden="true">{deck.appearance?.icon || '📚'}</span>
                  <h3 className={`${styles.decks.deckName}${isCollapsed ? ' is-collapsed' : ''}`} style={{ color: deckTextColor }}>
                    <button
                      type="button"
                      className="deck-card__study-button"
                      onClick={() => handleDeckSelect(deck)}
                      disabled={stats.total === 0}
                      aria-label={`Study ${deck.name}`}
                    >
                      {deck.name}
                    </button>
                  </h3>
                </div>
                <div className="deck-card__tools">
                  <button
                    type="button"
                    className={styles.decks.optionsBtn}
                    onClick={() => openStudyOptions(deck)}
                    aria-label={`Study options for ${deck.name}`}
                    title="Study options"
                  >
                    <FaCog />
                  </button>
                </div>
              </div>

              {!isCollapsed && <>
              {(deck.tags || []).length > 0 && (
                <div className="deck-card__tags">
                  {deck.tags.map(tag => <span key={tag} className="deck-card__tag">{tag}</span>)}
                </div>
              )}

                <div className={styles.decks.deckStats}>
                <DeckStatusSummary cards={deck.cards} />
                  <div className={styles.decks.statRow}>
                    <span className="deck-card__stat-label" style={{ color: deckTextColor }}>Created:</span>
                    <span style={{ color: deckTextColor }}>{formatDeckCreationDate(deck)}</span>
                  </div>
                  <div className={styles.decks.statRow}>
                    <span className="deck-card__stat-label" style={{ color: deckTextColor }}>Total study time:</span>
                    <span style={{ color: deckTextColor }}>{formatStudyTime(deck.totalStudyTimeSeconds)}</span>
                  </div>
                  {deckStudyOptions.mode !== 'cram' && (deckStudyOptions.cardLimit || deckStudyOptions.onlyMissed) && (
                  <div className={`${styles.decks.statRow} deck-card__stat--session`}>
                    <span className="deck-card__stat-label" style={{ color: deckTextColor }}>Study Session:</span>
                    <span className="deck-card__stat-label" style={{ color: deckTextColor }}>{stats.studyCount} cards</span>
                  </div>
                )}
              </div>

              <div className={styles.decks.deckActions}>
                <button
                  className={styles.decks.btnSecondary}
                  onClick={() => setEditingDeck(deck)}
                >
                  <FaEdit /> Edit
                </button>
                <button
                  className={deckStudyOptions.mode === 'cram' ? styles.decks.btnCram : styles.decks.btnPrimary}
                  onClick={() => handleDeckSelect(deck)}
                  disabled={stats.total === 0}
                >
                  <FaBook />
                  {stats.total === 0 ? 'No Cards' : deckStudyOptions.mode === 'cram' ? 'Cram' : 'Study'}
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
          <h2 className="decks-page__empty-title">No Decks Yet</h2>
          <p className="decks-page__empty-description">Create your first deck to start studying!</p>
        </div>
      )}
      {decks.length > 0 && visibleDecks.length === 0 && (
        <p className="decks-page__no-results">No decks match this tag.</p>
      )}
    </div>
  )
}
