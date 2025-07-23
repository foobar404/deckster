import { useState } from 'react'
import './ImportDecks.css'

const ImportDecks = ({ onDecksImported }) => {
  const [importText, setImportText] = useState('')
  const [deckName, setDeckName] = useState('')
  const [separator, setSeparator] = useState('comma')
  const [preview, setPreview] = useState(null)

  const parseCards = (text, sep) => {
    if (!text.trim()) return []
    
    const delimiter = sep === 'comma' ? ',' : '\t'
    const lines = text.split('\n').filter(line => line.trim())
    
    return lines.map((line, index) => {
      const parts = line.split(delimiter)
      if (parts.length >= 2) {
        return {
          id: Date.now() + index,
          front: parts[0].trim(),
          back: parts[1].trim(),
          difficulty: 0,
          lastReviewed: null
        }
      }
      return null
    }).filter(Boolean)
  }

  const handlePreview = () => {
    if (!importText.trim()) return
    const cards = parseCards(importText, separator)
    console.log('Parsed cards:', cards) // Debug log
    setPreview(cards)
  }

  const handleImport = () => {
    if (!deckName.trim()) {
      alert('Please enter a deck name.')
      return
    }
    
    if (!preview || preview.length === 0) {
      alert('Please preview cards before importing.')
      return
    }
    
    const newDeck = {
      id: Date.now(),
      name: deckName.trim(),
      cards: preview
    }
    
    console.log('Importing deck:', newDeck) // Debug log
    onDecksImported([newDeck])
    
    // Reset form
    setImportText('')
    setDeckName('')
    setPreview(null)
    
    alert(`Successfully imported ${preview.length} cards to "${newDeck.name}"!`)
  }

  const sampleData = {
    comma: `Hello,Hola
Thank you,Gracias
Please,Por favor
Goodbye,Adiós`,
    tab: `Hello\tHola
Thank you\tGracias
Please\tPor favor
Goodbye\tAdiós`
  }

  return (
    <div className="import-decks">
      <div className="header">
        <h1>Import Flashcards</h1>
        <p>Import cards from CSV or TSV text</p>
      </div>

      <div className="import-form glass rounded-lg">
        <div className="form-section">
          <label htmlFor="deckName">Deck Name</label>
          <input
            id="deckName"
            type="text"
            placeholder="Enter deck name..."
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
          />
        </div>

        <div className="form-section">
          <label>Separator Type</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                value="comma"
                checked={separator === 'comma'}
                onChange={(e) => setSeparator(e.target.value)}
              />
              <span>Comma (CSV)</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="tab"
                checked={separator === 'tab'}
                onChange={(e) => setSeparator(e.target.value)}
              />
              <span>Tab (TSV)</span>
            </label>
          </div>
        </div>

        <div className="form-section">
          <label htmlFor="importText">Card Data</label>
          <textarea
            id="importText"
            placeholder={`Format: front${separator === 'comma' ? ',' : '\t'}back\n\nExample:\n${sampleData[separator]}`}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
          />
          <div className="textarea-hint">
            Each line should contain a front and back separated by {separator === 'comma' ? 'commas' : 'tabs'}
          </div>
        </div>

        <div className="form-actions">
          <button 
            className="btn-secondary"
            onClick={handlePreview}
            disabled={!importText.trim()}
          >
            Preview Cards
          </button>
          <button 
            className="btn-primary"
            onClick={handleImport}
            disabled={!deckName.trim() || !preview || preview.length === 0}
          >
            Import Deck ({preview ? preview.length : 0} cards)
          </button>
        </div>
      </div>

      {preview && (
        <div className="preview-section glass rounded-lg">
          <h3>Preview ({preview.length} cards)</h3>
          <div className="preview-cards">
            {preview.slice(0, 5).map((card, index) => (
              <div key={index} className="preview-card">
                <div className="card-front">{card.front}</div>
                <div className="card-divider">→</div>
                <div className="card-back">{card.back}</div>
              </div>
            ))}
            {preview.length > 5 && (
              <div className="preview-more">
                ...and {preview.length - 5} more cards
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportDecks
