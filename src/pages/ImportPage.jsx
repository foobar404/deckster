import { useState, useEffect, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import styles from '../components/ImportDecks.module.css'

const ImportPage = () => {
  const { setDecks } = useContext(AppContext)
  const { showError, showInfo } = useToast()
  const [importText, setImportText] = useState('')
  const [deckName, setDeckName] = useState('')
  const [preview, setPreview] = useState(null)

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
    if (!deckName.trim()) {
      showError('Please enter a deck name.')
      return
    }
    
    if (!preview || preview.length === 0) {
      showError('Please add some card data to import.')
      return
    }
    
    const newDeck = {
      id: Date.now(),
      name: deckName.trim(),
      cards: preview
    }
    
    console.log('Importing deck:', newDeck) // Debug log
    
    setDecks(prev => {
      const updated = [...prev, newDeck]
      console.log('Updated decks array:', updated) // Debug log
      return updated
    })
    
    // Reset form
    setImportText('')
    setDeckName('')
    setPreview(null)
    
    showInfo(`Successfully imported ${preview.length} cards to "${newDeck.name}"!`)
  }

  const sampleData = `"cuchillo"	"knife https://upload.wikimedia.org/wikipedia/commons/3/3c/Kitchen_Knife.jpg"
"sartén"	"frying pan https://upload.wikimedia.org/wikipedia/commons/e/e5/Frying_pan.jpg"
"audio example"	"pronunciation https://example.com/audio.mp3"
Hello	Hola
Thank you,Gracias
Please,Por favor`

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
          <label htmlFor="importText">Card Data</label>
          <textarea
            id="importText"
            placeholder={`Format: front\tback or front,back\nOr: "front text" "back text"\nAny URLs (images, audio, video) can be included in text\n\nExample:\n${sampleData}`}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
          />
          <div className={styles.textareaHint}>
            Supports quoted text, any URLs in text, and auto-detects separators (tab/comma/space)
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
    </div>
  )
}

export default ImportPage
