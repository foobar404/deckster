import '../css/import.css'
import { useContext, useEffect, useRef, useState } from 'react'
import { FaChevronDown, FaUpload } from 'react-icons/fa'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'

const parseCards = text => {
  if (!text.trim()) return []

  return text.split('\n').filter(line => line.trim()).map((line, index) => {
    const quotedMatches = [...line.matchAll(/"([^"]*)"/g)]
    let front
    let back

    if (quotedMatches.length >= 2) {
      front = quotedMatches[0][1]
      back = quotedMatches[1][1]
    } else {
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.includes(',')
          ? line.split(',')
          : line.split(/\s+/)
      if (parts.length < 2) return null
      front = parts[0].trim()
      back = parts[1].trim()

      if (front.startsWith('"') && front.endsWith('"')) front = front.slice(1, -1)
      if (back.startsWith('"') && back.endsWith('"')) back = back.slice(1, -1)
    }

    if (!front || !back) return null

    return {
      id: Date.now() + index,
      front: front.trim(),
      back: back.trim(),
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
  }).filter(Boolean)
}

export function ImportPage() {
  const { decks, setDecks } = useContext(AppContext)
  const { showError, showInfo } = useToast()
  const [importText, setImportText] = useState('')
  const [deckName, setDeckName] = useState('')
  const [preview, setPreview] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setPreview(importText.trim() ? parseCards(importText) : null)
  }, [importText])

  const handleImport = () => {
    const targetName = deckName.trim()
    if (!targetName) {
      showError('Please enter a deck name.')
      return
    }
    if (!preview?.length) {
      showError('Please add some card data to import.')
      return
    }

    const baseId = Date.now()
    const cardsToAdd = preview.map((card, index) => ({ ...card, id: baseId + index }))
    const existingDeck = decks.find(deck => deck.name.toLowerCase() === targetName.toLowerCase())

    if (existingDeck) {
      setDecks(previousDecks => previousDecks.map(deck => (
        deck.id === existingDeck.id
          ? { ...deck, cards: [...deck.cards, ...cardsToAdd] }
          : deck
      )))
      showInfo(`Appended ${cardsToAdd.length} cards to "${existingDeck.name}".`)
    } else {
      const newDeck = {
        id: baseId + 9999,
        name: targetName,
        cards: cardsToAdd,
        createdAt: new Date().toISOString(),
        totalStudyTimeSeconds: 0
      }
      setDecks(previousDecks => [...previousDecks, newDeck])
      showInfo(`Successfully imported ${cardsToAdd.length} cards to "${newDeck.name}"!`)
    }

    setImportText('')
    setPreview(null)
  }

  const handleFileSelect = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      setImportText(await file.text())
      showInfo(`Loaded ${file.name}. Review the preview before importing.`)
    } catch {
      showError(`Could not read ${file.name}.`)
    }
  }

  return (
    <section className="import-page">
      <h1 className="import-page__title">Import Flashcards</h1>
      <p className="import-page__description">Import existing flashcards from pasted text or a file.</p>

      <div className="import-form">
        <div className="import-form__section">
          <label htmlFor="deckName" className="import-form__label">Deck Name</label>
          <div className="import-deck-dropdown">
            <input
              id="deckName"
              type="text"
              placeholder="Enter deck name"
              value={deckName}
              onChange={event => setDeckName(event.target.value)}
              onFocus={() => setShowDropdown(false)}
              className="field import-form__input"
            />
            <button
              type="button"
              className="button button--icon button--quiet import-deck-dropdown__toggle"
              onClick={() => setShowDropdown(open => !open)}
              aria-label="Choose an existing deck"
              aria-expanded={showDropdown}
            >
              <FaChevronDown className={`import-deck-dropdown__icon${showDropdown ? ' is-expanded' : ''}`} aria-hidden="true" />
            </button>
            {showDropdown && decks.length > 0 && (
              <div className="import-deck-dropdown__list">
                {decks.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map(deck => (
                  <button
                    key={deck.id}
                    type="button"
                    className="import-deck-dropdown__option"
                    onClick={() => {
                      setDeckName(deck.name)
                      setShowDropdown(false)
                    }}
                  >
                    <span className="import-deck-dropdown__option-name">{deck.name}</span>
                    <span className="import-deck-dropdown__option-count">({deck.cards.length} cards)</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="import-form__hint">
            {decks.length > 0
              ? `Type or select from ${decks.length} existing deck${decks.length === 1 ? '' : 's'}.`
              : 'Enter a name for your new deck.'}
          </p>
        </div>

        <div className="import-form__section">
          <div className="import-form__file-label">
            <label htmlFor="importText" className="import-form__label import-form__label--compact">Card Data</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              onChange={handleFileSelect}
              className="import-file-input"
              aria-label="Choose a CSV, TSV, or text file"
            />
          </div>
          <textarea
            id="importText"
            placeholder={'One CSV row per card: "front","back". Quote values containing commas.\n\nExample:\n"cuchillo","knife"\n"sartén","frying pan"\n"Hello","Hola"'}
            value={importText}
            onChange={event => setImportText(event.target.value)}
            rows={8}
            className="field import-form__input import-form__textarea"
          />
          <div className="import-form__hint import-form__hint--spaced">
            Supports quoted text, any URLs in text, and auto-detects separators (tab/comma/space).
          </div>
        </div>

        {preview?.length > 0 && (
          <section className="import-preview" aria-label="Card preview">
            <h2 className="import-preview__title">Preview ({preview.length} cards)</h2>
            <div className="import-preview__list">
              {preview.map((card, index) => (
                <div key={`${card.id}-${index}`} className="import-preview__card">
                  <p className="import-preview__front">{card.front}</p>
                  <p className="import-preview__back">{card.back}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="import-submit-row is-text-import">
          <button
            type="button"
            className="button button--primary import-submit"
            onClick={handleImport}
            disabled={!deckName.trim() || !preview?.length}
          >
            Import Deck
          </button>
          <button
            type="button"
            className="button button--icon button--outline import-file-button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import from file"
            title="Import from file"
          >
            <FaUpload aria-hidden="true" className="import-file-button__icon" />
          </button>
        </div>
      </div>
    </section>
  )
}
