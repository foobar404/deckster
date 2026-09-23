import { useStyle } from '../utils'
import { FaChevronDown } from 'react-icons/fa'
import { AppContext } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { useState, useEffect, useContext, useRef } from 'react'
import { FaFileUpload } from 'react-icons/fa'

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
  const [activeTab, setActiveTab] = useState('text')
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('deckster_openrouter_api_key') || ''
    } catch {
      return ''
    }
  })
  const [model, setModel] = useState(() => {
    try {
      return localStorage.getItem('deckster_openrouter_model') || 'google/gemini-2.5-flash-lite'
    } catch {
      return 'google/gemini-2.5-flash-lite'
    }
  })
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const [modelsRefresh, setModelsRefresh] = useState(0)
  const [topic, setTopic] = useState('')
  const [cardCount, setCardCount] = useState(20)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const fileInputRef = useRef(null)
  const modelsLoaded = useRef(false)

  useEffect(() => {
    try {
      localStorage.setItem('deckster_openrouter_model', model)
    } catch {
      // Keep the selection for this session if browser storage is unavailable.
    }
  }, [model])

  useEffect(() => {
    if (activeTab !== 'ai' || modelsLoaded.current) return

    let isCurrent = true
    setModelsLoading(true)
    setModelsError('')

    fetch('https://openrouter.ai/api/v1/models?sort=most-popular&limit=25&output_modalities=text&supported_parameters=max_tokens')
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error?.message || `Could not load models (${response.status}).`)
        }
        const availableModels = Array.isArray(result.data)
          ? result.data.filter((entry) => entry.id && entry.name)
          : []
        if (!availableModels.length) {
          throw new Error('OpenRouter returned no compatible text models.')
        }
        if (isCurrent) {
          setModels(availableModels)
          setModel((currentModel) => availableModels.some((entry) => entry.id === currentModel) ? currentModel : availableModels[0].id)
          modelsLoaded.current = true
        }
      })
      .catch((error) => {
        if (isCurrent) setModelsError(error.message || 'Could not load OpenRouter models.')
      })
      .finally(() => {
        if (isCurrent) setModelsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [activeTab, modelsRefresh])

  const formatModelPrice = (price) => {
    const perMillion = Number(price) * 1000000
    return Number.isFinite(perMillion) ? `$${perMillion.toLocaleString(undefined, { maximumFractionDigits: 2 })}/M` : 'n/a'
  }

  const handleApiKeyChange = (value) => {
    setApiKey(value)
    try {
      if (value) {
        localStorage.setItem('deckster_openrouter_api_key', value)
      } else {
        localStorage.removeItem('deckster_openrouter_api_key')
      }
    } catch {
      showError('Could not save the API key in this browser.')
    }
  }

  const handleGenerate = async () => {
    const cleanTopic = topic.trim()
    const requestedCount = Number(cardCount)

    if (!apiKey.trim()) {
      showError('Add your OpenRouter API key to generate cards.')
      return
    }
    if (!cleanTopic || cleanTopic.length > 4000) {
      showError('Enter a topic or instructions (up to 4,000 characters).')
      return
    }
    if (!model.trim()) {
      showError('Enter an OpenRouter model ID.')
      return
    }
    if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 300) {
      showError('Choose a whole number between 1 and 300 cards.')
      return
    }
    const selectedModel = models.find((entry) => entry.id === model)
    if (!selectedModel) {
      showError('Wait for the model list to load, then select a model.')
      return
    }

    setIsGenerating(true)
    try {
      const requestBody = {
        model: selectedModel.id,
        max_tokens: Math.min(32768, requestedCount * 100 + 500, selectedModel.top_provider?.max_completion_tokens || 32768),
        messages: [
          {
            role: 'system',
            content: 'Create accurate, useful flashcards. Return only a JSON object with a "cards" array. Each array item must have string fields "front" and "back". Do not include markdown or any text outside the JSON.'
          },
          {
            role: 'user',
            content: `Create exactly ${requestedCount} flashcards following the topic, language, and other instructions below. If no language is specified, use English.\n\n${cleanTopic}\n\nKeep each side concise and self-contained. Do not number the cards.`
          }
        ]
      }
      if (selectedModel.supported_parameters?.includes('structured_outputs') || selectedModel.supported_parameters?.includes('response_format')) {
        requestBody.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'flashcards',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                cards: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      front: { type: 'string' },
                      back: { type: 'string' }
                    },
                    required: ['front', 'back'],
                    additionalProperties: false
                  },
                  minItems: requestedCount,
                  maxItems: requestedCount
                }
              },
              required: ['cards'],
              additionalProperties: false
            }
          }
        }
        requestBody.provider = { require_parameters: true }
      }
      if (selectedModel.supported_parameters?.includes('temperature')) {
        requestBody.temperature = 0.6
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Deckster'
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error?.message || `OpenRouter request failed (${response.status}).`)
      }

      const content = result.choices?.[0]?.message?.content
      if (typeof content !== 'string') {
        throw new Error('The model returned no text. Try another model.')
      }

      const jsonText = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      const parsed = JSON.parse(jsonText)
      const generatedCards = parsed.cards
      if (!Array.isArray(generatedCards) || generatedCards.length !== requestedCount) {
        throw new Error(`Expected ${requestedCount} cards, but the model returned ${Array.isArray(generatedCards) ? generatedCards.length : 'an invalid response'}. Try again or use a different model.`)
      }

      const cards = generatedCards.map((card, index) => {
        const front = typeof card.front === 'string' ? card.front.trim() : ''
        const back = typeof card.back === 'string' ? card.back.trim() : ''
        if (!front || !back) {
          throw new Error(`Card ${index + 1} is missing a front or back.`)
        }
        return {
          id: Date.now() + index,
          front,
          back,
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
      })

      setPreview(cards)
      showInfo(`Generated ${cards.length} cards. Review them before importing.`)
    } catch (error) {
      showError(error instanceof SyntaxError ? 'The model returned invalid JSON. Try again or choose a model with good JSON support.' : error.message || 'Could not generate cards.')
    } finally {
      setIsGenerating(false)
    }
  }

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

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      setImportText(text)
      showInfo(`Loaded ${file.name}. Review the preview before importing.`)
    } catch {
      showError(`Could not read ${file.name}.`)
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
    activeTab,
    setActiveTab,
    apiKey,
    handleApiKeyChange,
    model,
    setModel,
    models,
    modelsLoading,
    modelsError,
    retryModels: () => setModelsRefresh((value) => value + 1),
    formatModelPrice,
    topic,
    setTopic,
    cardCount,
    setCardCount,
    isGenerating,
    handleGenerate,
    showDropdown,
    setShowDropdown,
    handleImport,
    fileInputRef,
    handleFileSelect,
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
    activeTab,
    setActiveTab,
    apiKey,
    handleApiKeyChange,
    model,
    setModel,
    models,
    modelsLoading,
    modelsError,
    retryModels,
    formatModelPrice,
    topic,
    setTopic,
    cardCount,
    setCardCount,
    isGenerating,
    handleGenerate,
    showDropdown,
    setShowDropdown,
    handleImport,
    fileInputRef,
    handleFileSelect,
    sampleData
  } = useImportPage()

  // Custom styles for ImportPage
  const customStyles = {
    container: 'w-full min-w-0 max-w-full p-4 pb-20 md:pb-4 md:max-w-3xl md:mx-auto',
    form: 'w-full min-w-0 p-4 sm:p-6 bg-white/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-lg',
    formSection: 'mb-6',
    label: 'block text-sm font-medium text-gray-700 mb-2',
    // add right padding so input text doesn't sit under the absolute toggle button
    input: 'w-full min-w-0 max-w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    textarea: 'w-full min-w-0 max-w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y',
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
      <p className="w-full text-left text-gray-600 mb-6">Import existing flashcards or generate a draft with your OpenRouter account.</p>

      <div className={styles.import.form}>
        <div className="mb-5 flex border-b border-gray-200" role="tablist" aria-label="Card source">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            onClick={() => setActiveTab('text')}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${activeTab === 'text' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            Paste or upload
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ai'}
            onClick={() => setActiveTab('ai')}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${activeTab === 'ai' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            AI assist
          </button>
        </div>

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
                {decks.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map(deck => (
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

        {activeTab === 'ai' && <div className={styles.import.formSection}>
          <div className="mb-5">
            <label htmlFor="openRouterKey" className={styles.import.label}>OpenRouter API key</label>
            <input
              id="openRouterKey"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => handleApiKeyChange(event.target.value)}
              placeholder="sk-or-v1-..."
              className={styles.import.input}
            />
            <p className={styles.import.hint}>Saved in this browser's local storage and sent directly to OpenRouter. Anyone with access to this browser profile can retrieve it. Your prompts are processed by the selected model provider.</p>
          </div>

          <div className="mb-5">
            <label htmlFor="openRouterModel" className={styles.import.label}>Model</label>
            <select
              id="openRouterModel"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={modelsLoading || models.length === 0}
              className={styles.import.input}
            >
              {modelsLoading && <option value="">Loading popular models...</option>}
              {!modelsLoading && models.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} · in {formatModelPrice(entry.pricing?.prompt)} / out {formatModelPrice(entry.pricing?.completion)}
                </option>
              ))}
              {!modelsLoading && models.length === 0 && <option value="">No models available</option>}
            </select>
            {modelsError ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className={styles.import.hint}>{modelsError}</p>
                <button type="button" onClick={retryModels} className="text-sm font-medium text-blue-700 hover:underline">Retry</button>
              </div>
            ) : (
              <p className={styles.import.hint}>Top 25 popular OpenRouter text models. Prices shown per million tokens; provider rates may vary.</p>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="aiTopic" className={styles.import.label}>Topic and instructions</label>
            <textarea
              id="aiTopic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={4000}
              rows={4}
              placeholder="For example: beginner Spanish food vocabulary, with the Spanish term on the front and a concise English translation on the back."
              className={styles.import.textarea}
            />
          </div>

          <div className="mb-5 max-w-sm">
            <label htmlFor="aiCardCount" className={styles.import.label}>Number of cards</label>
            <input
              id="aiCardCount"
              type="number"
              min="1"
              max="300"
              step="1"
              value={cardCount}
              onChange={(event) => setCardCount(event.target.value)}
              className={styles.import.input}
            />
          </div>

          <button
            type="button"
            className={styles.import.importButton}
            onClick={handleGenerate}
            disabled={isGenerating || modelsLoading || models.length === 0 || !apiKey.trim() || !topic.trim() || !Number.isInteger(Number(cardCount)) || Number(cardCount) < 1 || Number(cardCount) > 300}
          >
            {isGenerating ? 'Generating...' : 'Generate cards'}
          </button>
        </div>}

        {activeTab === 'text' && <div className={styles.import.formSection}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="importText" className={`${styles.import.label} mb-0`}>Card Data</label>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaFileUpload /> Import from file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Choose a CSV, TSV, or text file"
            />
          </div>
          <textarea
            id="importText"
            placeholder={'One CSV row per card: "front","back". Quote values containing commas.\n\nExample:\n"cuchillo","knife"\n"sartén","frying pan"\n"Hello","Hola"'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            className={styles.import.textarea}
          />
          <div className={styles.import.hint}>
            Supports quoted text, any URLs in text, and auto-detects separators (tab/comma/space)
          </div>
        </div>}

        {preview?.length > 0 && (
          <section className="mb-6" aria-label="Card preview">
            <h2 className="mb-2 text-sm font-semibold text-gray-800">Preview ({preview.length} cards)</h2>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
              {preview.map((card, index) => (
                <div key={`${card.id}-${index}`} className="grid grid-cols-1 gap-2 border-b border-gray-100 p-3 last:border-b-0 sm:grid-cols-2">
                  <p className="break-words text-sm text-gray-800">{card.front}</p>
                  <p className="break-words text-sm text-gray-600">{card.back}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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


