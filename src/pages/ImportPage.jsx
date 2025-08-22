import { useStyle } from '../utils'
import { FaChevronDown } from 'react-icons/fa'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { useState, useEffect, useContext } from 'react'

/**
 * Custom hook for ImportPage logic and state management
 * @returns {Object} All state and handlers needed by the ImportPage component
 */
const useImportPage = () => {
  const { decks, setDecks } = useContext(AppContext)
  const { showError, showInfo } = useToast()
  const [importText, setImportText] = useState('')
  const [deckName, setDeckName] = useState('')
  const [preview, setPreview] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const parseCards = (text) => {
    if (!text.trim()) return []

    const lines = text.split('\n').filter(line => line.trim())

    const parsedCards = lines.map((line, index) => {
      // First try to parse quoted sections
      const quotedRegex = /"([^"]*)"/g
      const quotedMatches = [...line.matchAll(quotedRegex)]

      let front, back

      if (quotedMatches.length >= 2) {
        // If we have quoted sections, use them
        front = quotedMatches[0][1]
        back = quotedMatches[1][1]
      } else {
        // Auto-detect delimiter: prefer tabs over commas
        let parts
        if (line.includes('\t')) {
          parts = line.split('\t')
        } else if (line.includes(',')) {
          parts = line.split(',')
        } else {
          // Fallback to space separation
          parts = line.split(/\s+/)
        }

        if (parts.length >= 2) {
          front = parts[0].trim()
          back = parts[1].trim()

          // Remove quotes if present
          if (front.startsWith('"') && front.endsWith('"')) {
            front = front.slice(1, -1)
          }
          if (back.startsWith('"') && back.endsWith('"')) {
            back = back.slice(1, -1)
          }
        } else {
          return null
        }
      }

      if (!front || !back) {
        return null
      }

      const card = {
        id: Date.now() + index,
        front: front.trim(),
        back: back.trim(),
        difficulty: 0,
        lastReviewed: null
      }

      return card
    }).filter(Boolean)

    return parsedCards
  }

  // Auto-generate preview when import text changes
  useEffect(() => {
    if (importText.trim()) {
      const cards = parseCards(importText)
      setPreview(cards)
    } else {
      setPreview(null)
    }
  }, [importText])

  const handleImport = () => {
    const targetName = deckName.trim()
    if (!targetName) {
      showError('Please enter a deck name.')
      return
    }

    if (!preview || preview.length === 0) {
      showError('Please add some card data to import.')
      return
    }

    // Prepare cards with unique ids
    const baseId = Date.now()
    const cardsToAdd = preview.map((c, i) => ({ ...c, id: baseId + i }))

    // Case-insensitive match for existing deck name
    const existingIndex = decks ? decks.findIndex(d => d.name.toLowerCase() === targetName.toLowerCase()) : -1

    if (existingIndex !== -1) {
      // Append cards to existing deck
      setDecks(prev => prev.map((d, idx) => idx === existingIndex ? { ...d, cards: [...d.cards, ...cardsToAdd] } : d))
      setImportText('')
      setPreview(null)
      showInfo(`Appended ${cardsToAdd.length} cards to "${decks[existingIndex].name}".`)
    } else {
      // Create a new deck
      const newDeck = {
        id: baseId + 9999, // ensure different id than card ids
        name: targetName,
        cards: cardsToAdd
      }

      setDecks(prev => {
        const updated = [...prev, newDeck]
        return updated
      })

      // Reset form but keep the name so user can import more if desired
      setImportText('')
      setPreview(null)
      showInfo(`Successfully imported ${cardsToAdd.length} cards to "${newDeck.name}"!`)
    }
  }

  const sampleData = `"cuchillo"\t"knife"
"sartén"\t"frying pan"
"audio example"\t"pronunciation"
Hello\tHola
Thank you\tGracias
Please\tPor favor`

  return {
    decks,
    importText,
    setImportText,
    deckName,
    setDeckName,
    preview,
    showDropdown,
    setShowDropdown,
    handleImport,
    sampleData
  }
}

export function ImportPage() {
  const {
    decks,
    importText,
    setImportText,
    deckName,
    setDeckName,
    preview,
    showDropdown,
    setShowDropdown,
    handleImport,
    sampleData
  } = useImportPage()

  // Custom styles for ImportPage
  const customStyles = {
    container: 'p-4 pb-20 md:pb-4',
    form: 'p-6 bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg',
    formSection: 'mb-6',
    label: 'block text-sm font-medium text-gray-700 mb-2',
    // add right padding so input text doesn't sit under the absolute toggle button
    input: 'w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    textarea: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical',
    hint: 'text-sm text-gray-500 mt-1',
    dropdown: 'relative',
    // make the toggle a small square button, center the icon with flexbox; disable transitions so clicks are instant
    dropdownToggle: 'absolute right-0 top-0 flex items-center justify-center w-8 h-8 p-0 text-gray-400 hover:text-gray-600 rounded-md bg-transparent hover:bg-gray-50 transition-none transform scale-[0.8]',
    importButton: 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
    dropdownList: 'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto'
  }

  const baseStyles = useStyle()
  const styles = { ...baseStyles, import: customStyles }

  return (<>
    <section className={styles.import.container}>
      <h1 className="w-full text-left text-2xl font-bold text-gray-900 mb-2">Import Flashcards</h1>
      <p className="w-full text-left text-gray-600 mb-6">Quickly import flashcards from plain text (tab/comma-separated or quoted lines).</p>

      <div className={styles.import.form}>
        <div className={styles.import.formSection}>
          <label htmlFor="deckName" className={styles.import.label}>Deck Name</label>
          <div className={styles.import.dropdown}>
            <input
              id="deckName"
              type="text"
              placeholder="Enter deck name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              onFocus={() => setShowDropdown(false)}
              className={styles.import.input}
            />
            <button
              type="button"
              className={styles.import.dropdownToggle}
              onClick={() => setShowDropdown(!showDropdown)}
              aria-hidden="true"
            >
              <FaChevronDown size={14} className={showDropdown ? 'transform rotate-180' : ''} />
            </button>
            {showDropdown && decks && decks.length > 0 && (
              <div className={styles.import.dropdownList}>
                {decks.map(deck => (
                  <div
                    key={deck.id}
                    className="p-3 hover:bg-white/5 cursor-pointer flex justify-between items-center"
                    onClick={() => {
                      setDeckName(deck.name)
                      setShowDropdown(false)
                    }}
                  >
                    <span className="font-medium">{deck.name}</span>
                    <span className="text-sm text-gray-500">({deck.cards.length} cards)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.import.hint}>
            {decks && decks.length > 0
              ? `Type or select from ${decks.length} existing deck${decks.length === 1 ? '' : 's'}.`
              : 'Enter a name for your new deck.'
            }
          </div>
        </div>

        <div className={styles.import.formSection}>
          <label htmlFor="importText" className={styles.import.label}>Card Data</label>
          <textarea
            id="importText"
            placeholder={`One card per line: front\tback or front,back. Use quotes for commas.\n\nExample:\n${sampleData}`}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            className={styles.import.textarea}
          />
          <div className={styles.import.hint}>
            Supports quoted text, any URLs in text, and auto-detects separators (tab/comma/space)
          </div>
        </div>

        <div className="flex justify-center">
          <button
            className={styles.import.importButton}
            onClick={handleImport}
          >
            Import Deck ({preview ? preview.length : 0} cards)
          </button>
        </div>
      </div>
    </section>
  </>)
}


