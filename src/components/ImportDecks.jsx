import { useState, useEffect } from 'react'
import styles from './ImportDecks.module.css'

const ImportDecks = ({ onDecksImported }) => {
  const [importText, setImportText] = useState('')
  const [deckName, setDeckName] = useState('')
  const [separator, setSeparator] = useState('comma')
  const [preview, setPreview] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [flippedCards, setFlippedCards] = useState(new Set())
  const cardsPerPage = 6

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

  // Auto-generate preview when import text or separator changes
  useEffect(() => {
    if (importText.trim()) {
      const cards = parseCards(importText, separator)
      setPreview(cards)
      setCurrentPage(1) // Reset to first page when preview changes
      setFlippedCards(new Set()) // Reset flipped cards
    } else {
      setPreview(null)
      setCurrentPage(1)
      setFlippedCards(new Set())
    }
  }, [importText, separator])

  const handleImport = () => {
    if (!deckName.trim()) {
      alert('Please enter a deck name.')
      return
    }
    
    if (!preview || preview.length === 0) {
      alert('Please add some card data to import.')
      return
    }
    
    const newDeck = {
      id: Date.now(),
      name: deckName.trim(),
      cards: preview
    }
    
    console.log('Importing deck:', newDeck) // Debug log
    console.log('onDecksImported function:', onDecksImported) // Debug log
    
    if (onDecksImported) {
      onDecksImported([newDeck])
    } else {
      console.error('onDecksImported function is not provided')
    }
    
    // Reset form
    setImportText('')
    setDeckName('')
    setPreview(null)
    setCurrentPage(1)
    setFlippedCards(new Set())
    
    alert(`Successfully imported ${preview.length} cards to "${newDeck.name}"!`)
  }

  const toggleCardFlip = (cardIndex) => {
    const actualIndex = (currentPage - 1) * cardsPerPage + cardIndex
    setFlippedCards(prev => {
      const newFlipped = new Set(prev)
      if (newFlipped.has(actualIndex)) {
        newFlipped.delete(actualIndex)
      } else {
        newFlipped.add(actualIndex)
      }
      return newFlipped
    })
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
    <div className={styles.importDecks}>
      <h1 className={styles.header}>Import Flashcards</h1>

      <div className={`${styles.importForm} glass rounded-lg`}>
        <div className={styles.formSection}>
          <label htmlFor="deckName">Deck Name</label>
          <input
            id="deckName"
            type="text"
            placeholder="Enter deck name..."
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
          />
        </div>

        <div className={styles.formSection}>
          <label>Separator Type</label>
          <div className={styles.radioGroup}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                value="comma"
                checked={separator === 'comma'}
                onChange={(e) => setSeparator(e.target.value)}
              />
              <span>Comma (CSV)</span>
            </label>
            <label className={styles.radioOption}>
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

        <div className={styles.formSection}>
          <label htmlFor="importText">Card Data</label>
          <textarea
            id="importText"
            placeholder={`Format: front${separator === 'comma' ? ',' : '\t'}back\n\nExample:\n${sampleData[separator]}`}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
          />
          <div className={styles.textareaHint}>
            Each line should contain a front and back separated by {separator === 'comma' ? 'commas' : 'tabs'}
          </div>
        </div>

        <div className={styles.formActions}>
          <button 
            className="btn-primary"
            onClick={handleImport}
          >
            Import Deck ({preview ? preview.length : 0} cards)
          </button>
        </div>
      </div>

      {preview && preview.length > 0 && (
        <div className={`styles.previewSection glass rounded-lg`}>
          <h3>Preview ({preview.length} cards)</h3>
          <div className={styles.previewGrid}>
            {preview
              .slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage)
              .map((card, index) => {
                const actualIndex = (currentPage - 1) * cardsPerPage + index
                const isFlipped = flippedCards.has(actualIndex)
                
                return (
                  <div 
                    key={index} 
                    className={`preview-card glass ${isFlipped ? 'flipped' : ''}`}
                    onClick={() => toggleCardFlip(index)}
                  >
                    <div className={styles.cardInner}>
                      <div className={`styles.cardSide styles.front`}>
                        <div className={styles.cardLabel}>Front</div>
                        <div className={styles.cardContent}>{card.front}</div>
                      </div>
                      <div className={`styles.cardSide styles.back`}>
                        <div className={styles.cardLabel}>Back</div>
                        <div className={styles.cardContent}>{card.back}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
          
          {preview.length > cardsPerPage && (
            <div className={styles.pagination}>
              <button 
                className={styles.paginationBtn}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              
              <div className={styles.paginationInfo}>
                Page {currentPage} of {Math.ceil(preview.length / cardsPerPage)}
                <span className={styles.cardRange}>
                  (Cards {(currentPage - 1) * cardsPerPage + 1}-{Math.min(currentPage * cardsPerPage, preview.length)} of {preview.length})
                </span>
              </div>
              
              <button 
                className={styles.paginationBtn}
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(preview.length / cardsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(preview.length / cardsPerPage)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ImportDecks
